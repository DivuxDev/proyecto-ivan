# Scripts de gestión TagMap

Scripts bash para automatizar instalación, actualización y sincronización de TagMap en Container Station (QNAP NAS).

## Requisitos previos

- QNAP NAS con Container Station instalado
- Acceso SSH habilitado en el NAS
- Git instalado (opcional, para update.sh)
- Docker y Docker Compose funcionando

## Scripts disponibles

### 📦 install.sh — Primera instalación

Instala TagMap por primera vez con configuración interactiva.

```bash
ssh admin@tu-nas-ip
cd /share/homes/admin/tagmap
bash install.sh
```

**Incluye:**
- Verificación de Docker/Docker Compose
- Creación de `.env` con validación interactiva
- Build de imágenes Docker
- Inicialización de base de datos (migraciones + seed)
- Usuario admin por defecto: `admin@tagmap.app` / `admin123`

---

### 🔄 update.sh — Actualización desde Git

Actualiza TagMap a la última versión desde GitHub sin perder datos.

```bash
cd /share/homes/admin/tagmap
bash update.sh
```

**Incluye:**
- Backup automático de `.env`
- Descarga de commits nuevos
- Reconstrucción de imágenes Docker
- Ejecución de migraciones (si hay cambios en esquema DB)
- Reinicio de servicios

**⚠️ Importante:** Guarda un backup de `.env.backup.<timestamp>` antes de actualizar.

---

### 🔄 sync.sh — Sincronización de emergencia

Reimporta fotos desde el NAS cuando la base de datos se ha perdido o está vacía.

```bash
cd /share/homes/admin/tagmap
bash sync.sh
```

**Uso ideal:**
- Tras reinstalación completa de TagMap
- Cuando la BD se ha corrompido/borrado
- Para recuperar estado tras disaster recovery

**Cómo funciona:**
1. Escanea todas las carpetas en `/share/TagMapFotos`
2. Detecta fotos pendientes de importar
3. El Folder Watcher las importa automáticamente
4. Detecta duplicados por hash MD5 (no reimporta fotos ya existentes)

---

## Flujo de trabajo recomendado

### Primera instalación
```bash
# 1. Clonar repositorio
ssh admin@tu-nas-ip
cd /share/homes/admin
git clone -b folder-concept https://github.com/tu-usuario/tagmap.git
cd tagmap

# 2. Ejecutar instalación
bash install.sh

# 3. Verificar funcionamiento
docker compose ps
docker compose logs -f
```

### Actualización regular
```bash
# 1. Conectar al NAS
ssh admin@tu-nas-ip
cd /share/homes/admin/tagmap

# 2. Actualizar
bash update.sh

# 3. Verificar logs
docker compose logs -f backend
```

### Recuperación tras desastre
```bash
# 1. Reinstalar si es necesario
bash install.sh

# 2. Sincronizar fotos desde NAS
bash sync.sh

# 3. Verificar importación
docker compose logs -f backend
# Acceder a http://tu-nas-ip:3000/dashboard/photos
```

---

## Monitorización en tiempo real

El dashboard admin incluye un panel **Folder Watcher Status** que muestra:
- ✅ Última fecha de sincronización
- ✅ Fotos importadas en el último scan
- ✅ Errores detectados
- ✅ Tiempo hasta próximo escaneo
- ✅ Estado en tiempo real (escaneando/activo/inactivo)

**Acceso:** http://tu-nas-ip:3000/dashboard

---

## Troubleshooting

### Los scripts no tienen permisos de ejecución
```bash
chmod +x install.sh update.sh sync.sh
```

### El .env no existe
```bash
cp .env.example .env
nano .env
# Editar variables necesarias
```

### Docker Compose no encuentra la imagen
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Ver logs en tiempo real
```bash
# Todos los servicios
docker compose logs -f

# Solo backend
docker compose logs -f backend

# Solo frontend
docker compose logs -f frontend
```

### Verificar estado del Folder Watcher
```bash
# Ver si está habilitado
grep ENABLE_FOLDER_WATCHER .env

# Ver carpeta monitoreada
grep WATCH_FOLDERS_DIR .env

# Ver último scan en logs
docker compose logs backend | grep "Escaneando carpetas"
```

---

## Variables de entorno importantes

```env
# Habilitar Folder Watcher
ENABLE_FOLDER_WATCHER=true

# Carpeta del NAS donde están las fotos
WATCH_FOLDERS_DIR=/share/TagMapFotos

# Intervalo de escaneo (segundos)
SCAN_INTERVAL_SECONDS=60

# Base de datos
DATABASE_URL=postgresql://tagmap_user:password@db:5432/tagmap_db

# JWT Secret (generar con: openssl rand -hex 32)
JWT_SECRET=tu_secret_aleatorio_de_64_caracteres
```

---

## Documentación relacionada

- [CLAUDE.md](CLAUDE.md) — Documentación completa del proyecto
- [FOLDER-WATCHER.md](FOLDER-WATCHER.md) — Guía del Folder Watcher
- [DEPLOY-QNAP.md](DEPLOY-QNAP.md) — Despliegue paso a paso en QNAP
- [TESTING.md](TESTING.md) — Guía de pruebas locales
- [ONEDRIVE-POWER-AUTOMATE.md](ONEDRIVE-POWER-AUTOMATE.md) — Integración con OneDrive
