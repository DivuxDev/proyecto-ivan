# TagMap Manager - Script de Gestión para QNAP

Script interactivo todo-en-uno para gestionar TagMap en tu NAS QNAP.

## 🚀 Uso rápido

```bash
# Conectar al NAS
ssh DavidPrado@192.168.1.201

# Ir al proyecto
cd /share/homes/DavidPrado/tagmap

# Ejecutar el gestor
sudo ./tagmap-manager.sh
```

## 📋 Funciones

### 1. Instalación inicial completa 🚀

**Cuándo usar:** Primera vez que instalas TagMap en el NAS

**Qué hace:**
- ✅ Verifica Docker y Docker Compose
- ✅ Crea carpetas necesarias con permisos correctos
- ✅ Verifica y configura archivo `.env`
- ✅ Construye imágenes Docker
- ✅ Levanta contenedores
- ✅ Ejecuta migraciones de base de datos
- ✅ Crea usuarios iniciales (admin y worker demo)
- ✅ Muestra credenciales de acceso

**Requisitos previos:**
- Tener el código clonado en `/share/homes/DavidPrado/tagmap`
- Editar el archivo `.env` antes de instalar

---

### 2. Actualizar desde GitHub 🔄

**Cuándo usar:** Cuando hay una nueva versión de TagMap disponible

**Qué hace:**
- ✅ Detecta la rama actual (main/folder-concept)
- ✅ Hace backup automático del archivo `.env`
- ✅ Descarga actualizaciones usando contenedor Git (sin necesidad de tener Git instalado)
- ✅ Muestra commits nuevos disponibles
- ✅ Pregunta confirmación antes de actualizar
- ✅ Restaura el `.env` tras actualizar
- ✅ Reconstruye contenedores con el nuevo código
- ✅ Ejecuta migraciones si hay cambios en BD

**Ventajas:**
- No necesitas tener Git instalado en el NAS
- Backup automático del `.env`
- Proceso seguro con confirmación

---

### 3. Resetear y remigrar base de datos 🗄️

**Cuándo usar:**
- La base de datos está corrupta
- Quieres empezar de cero conservando las fotos del NAS
- Después de cambios importantes en el schema
- Para sincronizar todas las fotos desde el NAS

**Qué hace:**
- ✅ Hace backup automático de la BD actual
- ✅ Elimina el volumen de PostgreSQL
- ✅ Crea base de datos limpia desde cero
- ✅ Ejecuta todas las migraciones
- ✅ Crea usuarios iniciales (seed)
- ✅ Escanea carpetas de equipos en el NAS
- ✅ Activa Folder Watcher si estaba deshabilitado
- ✅ Sincroniza automáticamente todas las fotos

**Advertencia:** Elimina todos los datos de la BD (usuarios, configuraciones). Los archivos de fotos en el NAS NO se borran.

**Proceso de sincronización:**
1. Escanea `/share/Container/imagenes-tagmap/`
2. Cuenta fotos por cada carpeta de equipo
3. Pregunta si quieres habilitar Folder Watcher
4. Las fotos se importan automáticamente cada 60 segundos

---

### 4. Ver estado y logs 📊

**Cuándo usar:** Para monitorizar el sistema

**Qué muestra:**
- Estado de contenedores (running/stopped)
- Carpetas configuradas
- Número de fotos por equipo (pendientes y procesadas)
- Configuración del `.env`
- URL de acceso
- Opción de ver logs en tiempo real

**Útil para:**
- Verificar que todo funciona correctamente
- Ver cuántas fotos hay pendientes de procesar
- Monitorizar el Folder Watcher
- Debugging

---

## 🛠️ Configuración

El script usa estas rutas (configúralas al principio del archivo si son diferentes):

```bash
PROJECT_DIR="/share/homes/DavidPrado/tagmap"
DOCKER_COMPOSE_FILE="docker-compose.qnap.yml"
NAS_IP="192.168.1.201"
IMAGES_ORIGINAL="/share/Container/imagenes-tagmap"
IMAGES_OPTIMIZED="/share/Container/imagenes-tagmap-optimized"
```

## 📁 Estructura de carpetas requerida

Para que el Folder Watcher funcione:

```
/share/Container/imagenes-tagmap/
  ├── Equipo-Norte/
  │   ├── foto1.jpg           ← Detectada
  │   ├── foto2.jpg           ← Detectada
  │   └── procesadas/         ← Creada automáticamente
  │       ├── foto1.jpg       ← Movida tras procesar
  │       └── foto2.jpg       ← Movida tras procesar
  ├── Equipo-Sur/
  │   └── IMG_001.jpg
  └── Equipo-Centro/
      └── DCIM_1234.jpg
```

## 🔐 Permisos

El script debe ejecutarse con permisos de administrador:

```bash
# Opción 1: Usar sudo
sudo ./tagmap-manager.sh

# Opción 2: Conectar como admin
ssh admin@192.168.1.201
cd /share/homes/DavidPrado/tagmap
./tagmap-manager.sh
```

## 💡 Ejemplos de uso

### Primera instalación completa

```bash
ssh DavidPrado@192.168.1.201
cd /share/homes/DavidPrado/tagmap

# Editar .env antes de instalar
nano .env

# Ejecutar instalación
sudo ./tagmap-manager.sh
# Seleccionar opción 1
```

### Actualizar a la última versión

```bash
ssh DavidPrado@192.168.1.201
cd /share/homes/DavidPrado/tagmap

sudo ./tagmap-manager.sh
# Seleccionar opción 2
# Confirmar actualización
```

### Recuperar tras pérdida de base de datos

```bash
ssh DavidPrado@192.168.1.201
cd /share/homes/DavidPrado/tagmap

# Asegurarse de que las fotos están en /share/Container/imagenes-tagmap/
ls -la /share/Container/imagenes-tagmap/

sudo ./tagmap-manager.sh
# Seleccionar opción 3
# Confirmar escribiendo "SI" en mayúsculas
# Esperar a que se sincronicen las fotos
```

### Monitorizar el sistema

```bash
sudo ./tagmap-manager.sh
# Seleccionar opción 4
# Ver estado
# Opcionalmente ver logs en tiempo real
```

## 🐛 Troubleshooting

### Error: "Permission denied"

```bash
# Solución: Ejecutar con sudo
sudo ./tagmap-manager.sh

# O conectar como admin
ssh admin@192.168.1.201
```

### Error: "docker-compose.qnap.yml not found"

```bash
# Verificar que estás en el directorio correcto
cd /share/homes/DavidPrado/tagmap
ls -la docker-compose.qnap.yml
```

### Las fotos no se sincronizan

1. Verificar que están en la carpeta correcta:
   ```bash
   ls -la /share/Container/imagenes-tagmap/
   ```

2. Verificar que Folder Watcher está habilitado:
   ```bash
   grep ENABLE_FOLDER_WATCHER .env
   # Debe mostrar: ENABLE_FOLDER_WATCHER=true
   ```

3. Ver logs del backend:
   ```bash
   docker compose -f docker-compose.qnap.yml logs -f backend
   ```

### PostgreSQL no arranca

```bash
# Ver logs de la base de datos
docker compose -f docker-compose.qnap.yml logs db

# Verificar volúmenes
docker volume ls | grep postgres

# Reiniciar contenedor
docker compose -f docker-compose.qnap.yml restart db
```

## 📚 Documentación relacionada

- [INSTALL-QNAP.md](INSTALL-QNAP.md) - Instalación manual paso a paso
- [DEPLOY-QNAP.md](DEPLOY-QNAP.md) - Deployment completo en producción
- [FOLDER-WATCHER.md](FOLDER-WATCHER.md) - Documentación del Folder Watcher
- [ONEDRIVE-POWER-AUTOMATE.md](ONEDRIVE-POWER-AUTOMATE.md) - Integración con OneDrive

## 🎯 Ventajas de usar este script

- ✅ **Todo automatizado** - Un solo comando para cada tarea
- ✅ **Seguro** - Backups automáticos antes de cambios importantes
- ✅ **Interactivo** - Pide confirmación antes de acciones destructivas
- ✅ **Sin Git** - Actualiza desde GitHub usando contenedor Docker
- ✅ **Sincronización completa** - Importa fotos existentes en el NAS
- ✅ **Colorido** - Output claro y fácil de leer
- ✅ **Menú persistente** - Vuelve al menú tras cada operación
