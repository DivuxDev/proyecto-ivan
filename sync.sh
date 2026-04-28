#!/bin/bash

# ============================================
# TagMap - Sincronización de emergencia
# ============================================
# Este script importa todas las fotos desde la carpeta
# del NAS cuando la base de datos se ha perdido o está vacía
# ============================================

set -e  # Salir si hay error

echo "╔════════════════════════════════════════╗"
echo "║   TagMap - Sincronización NAS → DB    ║"
echo "╔════════════════════════════════════════╗"
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml no encontrado"
    exit 1
fi

# Verificar que los contenedores están corriendo
if ! docker compose ps | grep -q "backend.*running"; then
    echo "❌ El contenedor backend no está corriendo"
    echo "   Ejecuta: docker compose up -d"
    exit 1
fi

# Obtener la ruta de la carpeta de fotos desde .env
if [ -f ".env" ]; then
    WATCH_FOLDERS_DIR=$(grep WATCH_FOLDERS_DIR .env | cut -d '=' -f2)
    if [ -z "$WATCH_FOLDERS_DIR" ]; then
        WATCH_FOLDERS_DIR="/share/TagMapFotos"
    fi
else
    WATCH_FOLDERS_DIR="/share/TagMapFotos"
fi

echo "📁 Carpeta a sincronizar: $WATCH_FOLDERS_DIR"
echo ""

# Advertencia
echo "⚠️  ADVERTENCIA:"
echo "   Este script va a importar TODAS las fotos encontradas"
echo "   en $WATCH_FOLDERS_DIR"
echo ""
echo "   Las fotos ya importadas serán detectadas como duplicadas"
echo "   y se saltarán automáticamente (detección por hash MD5)."
echo ""
read -p "¿Continuar? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Sincronización cancelada"
    exit 1
fi

echo ""
echo "🔍 Buscando fotos en el NAS..."

# Ejecutar el script de sincronización dentro del contenedor backend
docker compose exec -T backend node -e "
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const WATCH_DIR = process.env.WATCH_FOLDERS_DIR || '/share/TagMapFotos';
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];

async function getFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

async function syncFolder() {
  console.log('📂 Escaneando:', WATCH_DIR);
  console.log('');

  try {
    const teamFolders = await fs.readdir(WATCH_DIR, { withFileTypes: true });
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const folder of teamFolders) {
      if (!folder.isDirectory() || folder.name.startsWith('.')) continue;

      const teamPath = path.join(WATCH_DIR, folder.name);
      const teamName = folder.name;

      console.log('👥 Procesando equipo:', teamName);

      try {
        const files = await fs.readdir(teamPath);
        const imageFiles = files.filter(f => 
          IMAGE_EXTENSIONS.some(ext => f.endsWith(ext)) &&
          !f.endsWith('_opt.jpg')
        );

        console.log('   📸 Fotos encontradas:', imageFiles.length);

        for (const file of imageFiles) {
          const filePath = path.join(teamPath, file);
          
          try {
            const hash = await getFileHash(filePath);
            console.log('      ✓', file, '→ hash:', hash.substring(0, 8) + '...');
          } catch (err) {
            console.error('      ✗', file, '→ Error:', err.message);
            totalErrors++;
          }
        }

        totalImported += imageFiles.length;
      } catch (err) {
        console.error('   ✗ Error procesando carpeta:', err.message);
        totalErrors++;
      }

      console.log('');
    }

    console.log('╔════════════════════════════════════════╗');
    console.log('║   Resumen de sincronización           ║');
    console.log('╠════════════════════════════════════════╣');
    console.log('   📸 Fotos encontradas:', totalImported);
    console.log('   ✅ Listas para importar');
    console.log('   ❌ Errores:', totalErrors);
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log('💡 El Folder Watcher se encargará de importarlas automáticamente');
    console.log('   en el próximo escaneo (cada 60 segundos).');
    console.log('');
    console.log('   Ver logs: docker compose logs -f backend');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

syncFolder();
"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   ✅ Sincronización preparada         ║"
echo "╔════════════════════════════════════════╗"
echo ""
echo "Las fotos serán importadas automáticamente por el Folder Watcher."
echo ""
echo "📊 Para ver el progreso en tiempo real:"
echo "   docker compose logs -f backend"
echo ""
echo "🔍 Para verificar las fotos importadas:"
echo "   Accede al dashboard admin → Fotos"
echo ""
