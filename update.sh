#!/bin/bash

# ============================================
# TagMap - Script de actualización
# ============================================

set -e  # Salir si hay error

echo "╔════════════════════════════════════════╗"
echo "║   TagMap - Actualización desde Git    ║"
echo "╔════════════════════════════════════════╗"
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml no encontrado"
    exit 1
fi

# Verificar Git
if ! command -v git &> /dev/null; then
    echo "❌ Git no está instalado"
    exit 1
fi

# Mostrar rama actual
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Rama actual: $CURRENT_BRANCH"
echo ""

# Verificar si hay cambios locales sin commitear
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Tienes cambios locales sin commitear:"
    git status --short
    echo ""
    read -p "¿Quieres descartarlos y continuar? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        git reset --hard HEAD
        echo "✅ Cambios locales descartados"
    else
        echo "❌ Actualización cancelada"
        exit 1
    fi
fi

# Backup del .env
echo "💾 Haciendo backup de .env..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup guardado"
echo ""

# Fetch cambios del remoto
echo "📥 Descargando cambios del repositorio..."
git fetch origin

# Mostrar commits nuevos disponibles
NEW_COMMITS=$(git log HEAD..origin/$CURRENT_BRANCH --oneline)
if [ -z "$NEW_COMMITS" ]; then
    echo "✅ Ya estás en la última versión"
    echo ""
    read -p "¿Quieres reconstruir contenedores de todas formas? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "❌ Actualización cancelada"
        exit 0
    fi
else
    echo "📋 Nuevos commits disponibles:"
    echo "$NEW_COMMITS"
    echo ""
    read -p "¿Continuar con la actualización? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "❌ Actualización cancelada"
        exit 1
    fi
fi

echo ""
echo "⏸️  Parando contenedores..."
docker compose down

echo ""
echo "📥 Actualizando código..."
git pull origin $CURRENT_BRANCH

echo ""
echo "🔨 Reconstruyendo imágenes Docker..."
docker compose build

echo ""
echo "▶️  Arrancando contenedores..."
docker compose up -d

echo ""
echo "⏳ Esperando a que los servicios arranquen (15s)..."
sleep 15

echo ""
echo "🗃️  Ejecutando migraciones (por si hay cambios en BD)..."
if docker compose exec -T backend npm run db:migrate; then
    echo "✅ Migraciones ejecutadas correctamente"
else
    echo "⚠️  Las migraciones fallaron, pero la app puede funcionar"
fi

echo ""
echo "✅ Estado de contenedores:"
docker compose ps

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   ✅ Actualización completada         ║"
echo "╔════════════════════════════════════════╗"
echo ""
echo "🌐 La aplicación está disponible en:"
echo "   http://localhost:3000"
echo ""
echo "📊 Ver logs en tiempo real:"
echo "   docker compose logs -f"
echo ""
echo "💾 Backups de .env guardados en:"
echo "   .env.backup.*"
echo ""
