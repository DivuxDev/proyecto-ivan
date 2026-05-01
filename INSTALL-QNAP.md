# Guía de Instalación en QNAP NAS

## Configuración actual

- **Proyecto:** `/share/homes/DavidPrado/tagmap`
- **Imágenes originales:** `/share/Container/imagenes-tagmap`
- **Imágenes optimizadas:** `/share/Container/imagenes-tagmap-optimized`

---

## 🚀 Inicio Rápido (Recomendado)

### Script de gestión automática

TagMap incluye un script interactivo que gestiona todo: instalación, actualización y mantenimiento.

```bash
# Conectar al NAS
ssh DavidPrado@192.168.1.201

# Navegar al proyecto
cd /share/homes/DavidPrado/tagmap

# Dar permisos de ejecución
chmod +x tagmap-manager.sh

# Ejecutar el gestor
sudo ./tagmap-manager.sh
```

El script muestra un menú con opciones:
1. **🚀 Instalación inicial completa** - Primera vez
2. **🔄 Actualizar desde GitHub** - Actualizar código
3. **🗄️ Resetear y remigrar base de datos** - Reconstruir BD y sincronizar fotos
4. **📊 Ver estado y logs** - Monitorizar el sistema
5. **🚪 Salir**

**Todo está automatizado**: backup, migraciones, sincronización de fotos, verificación de estado.

---

## Instalación Manual (Paso a Paso)

Si prefieres hacerlo manualmente o entender cada paso:

### 1. Preparar las carpetas en el NAS

Conecta por SSH al QNAP y crea las carpetas necesarias:

```bash
# Conectar al NAS
ssh admin@<IP-DEL-NAS>

# Crear carpetas si no existen
mkdir -p /share/Container/imagenes-tagmap
mkdir -p /share/Container/imagenes-tagmap-optimized

# Dar permisos
chmod 777 /share/Container/imagenes-tagmap
chmod 777 /share/Container/imagenes-tagmap-optimized
```

### 2. Estructura de carpetas para Folder Watcher

Si quieres usar el modo automático (Folder Watcher), organiza las imágenes originales por equipos:

```bash
/share/Container/imagenes-tagmap/
  ├── Equipo-Norte/
  │   ├── foto1.jpg
  │   ├── foto2.jpg
  │   └── procesadas/       # ← Se crea automáticamente
  ├── Equipo-Sur/
  │   └── IMG_001.jpg
  └── Equipo-Centro/
      └── DCIM_1234.jpg
```

El backend escaneará estas carpetas cada 60 segundos y auto-importará las fotos nuevas.

### 3. Configurar variables de entorno

El archivo `.env` ya está configurado con tus rutas. **IMPORTANTE:** Ajusta estas variables:

```bash
# Editar .env
nano .env
```

Cambia estos valores:

```env
# La IP de tu NAS (reemplaza 192.168.1.100 por la IP real)
CORS_ORIGIN=http://192.168.1.100:3000

# Si quieres acceso externo con Cloudflare Tunnel:
# CORS_ORIGIN=https://tagmap.tu-dominio.com
```

### 4. Levantar los contenedores

**IMPORTANTE:** En QNAP, Docker Compose debe ejecutarse con permisos de administrador.

#### Opción A: Ejecutar como admin (recomendado)

```bash
# Navegar al proyecto
cd /share/homes/DavidPrado/tagmap

# Ejecutar como admin usando sudo
sudo docker compose -f docker-compose.qnap.yml up -d --build

# Ver logs en tiempo real
sudo docker compose -f docker-compose.qnap.yml logs -f
```

#### Opción B: Cambiar al usuario admin

```bash
# Cerrar sesión SSH y conectar como admin
ssh admin@<IP-DEL-NAS>

# Navegar al proyecto
cd /share/homes/DavidPrado/tagmap

# Levantar sin sudo
docker compose -f docker-compose.qnap.yml up -d --build
```

#### Opción C: Agregar tu usuario al grupo de Docker

```bash
# Como admin, agregar DavidPrado al grupo containers
sudo usermod -aG containers DavidPrado

# Cerrar sesión SSH y volver a conectar para aplicar cambios
exit

# Reconectar
ssh DavidPrado@<IP-DEL-NAS>

# Ahora debería funcionar sin sudo
cd /share/homes/DavidPrado/tagmap
docker compose -f docker-compose.qnap.yml up -d --build
```

**Nota:** Si ninguna opción funciona, usa Container Station UI (ver más abajo).

### 5. Inicializar la base de datos

```bash
# Ejecutar migraciones
docker compose -f docker-compose.qnap.yml exec backend npm run db:migrate

# Crear usuario admin inicial
docker compose -f docker-compose.qnap.yml exec backend npm run db:seed
```

**Credenciales por defecto:**
- Admin: `admin@tagmap.app` / `Admin1234!`
- Worker demo: `worker@tagmap.app` / `Worker1234!`

### 6. Acceder a TagMap

Abre tu navegador y ve a:

```
http://<IP-DEL-NAS>:3000
```

Por ejemplo: `http://192.168.1.100:3000`

---

## Comandos útiles

```bash
# Ver estado de los contenedores
docker compose -f docker-compose.qnap.yml ps

# Ver logs en tiempo real
docker compose -f docker-compose.qnap.yml logs -f

# Parar los contenedores
docker compose -f docker-compose.qnap.yml down

# Reiniciar solo el backend
docker compose -f docker-compose.qnap.yml restart backend

# Acceder a la shell del backend
docker compose -f docker-compose.qnap.yml exec backend sh

# Ver logs del Folder Watcher
docker compose -f docker-compose.qnap.yml logs -f backend | grep "Escaneando\|Procesando\|importadas"

# Actualizar TagMap desde GitHub (automático)
./update-qnap.sh

# Actualizar TagMap desde GitHub (manual con Docker)
docker run --rm -v /share/homes/DavidPrado/tagmap:/git alpine/git -C /git pull origin main

# Ejecutar migraciones de base de datos
docker compose -f docker-compose.qnap.yml exec backend npm run db:migrate

# Reconstruir contenedores tras actualizar código
docker compose -f docker-compose.qnap.yml up -d --build
```

---

## Verificar que funciona

### Modo manual (subir desde la web)

1. Accede a `http://<IP-NAS>:3000/login`
2. Login con las credenciales de worker
3. Ve a "Subir Foto"
4. Sube una foto con GPS
5. Verifica que aparece en el mapa

**La foto optimizada se guardará en:** `/share/Container/imagenes-tagmap-optimized/`

### Modo automático (Folder Watcher)

1. Copia una foto con GPS a: `/share/Container/imagenes-tagmap/Equipo-Prueba/test.jpg`
2. Espera 60 segundos
3. Verifica los logs: `docker compose -f docker-compose.qnap.yml logs backend`
4. Deberías ver: "✅ test.jpg" y "Importadas: 1"
5. La foto original se moverá a: `/share/Container/imagenes-tagmap/Equipo-Prueba/procesadas/test.jpg`
6. La foto optimizada estará en: `/share/Container/imagenes-tagmap-optimized/`

---

## Troubleshooting

### Los contenedores no arrancan

```bash
# Ver logs completos
docker compose -f docker-compose.qnap.yml logs

# Verificar que PostgreSQL está listo
docker compose -f docker-compose.qnap.yml exec db pg_isready -U tagmap_user
```

### El Folder Watcher no detecta fotos

```bash
# Verificar que la variable está activada
docker compose -f docker-compose.qnap.yml exec backend printenv | grep FOLDER_WATCHER

# Debe mostrar:
# ENABLE_FOLDER_WATCHER=true

# Verificar permisos de la carpeta
ls -la /share/Container/imagenes-tagmap

# Verificar que el contenedor puede leer la carpeta
docker compose -f docker-compose.qnap.yml exec backend ls -la /share/TagMapFotos
```

### Error de CORS

Si ves errores de CORS en el navegador:

1. Verifica que `CORS_ORIGIN` en `.env` coincide con la URL que usas para acceder
2. Reinicia el backend: `docker compose -f docker-compose.qnap.yml restart backend`

### Backup de la base de datos

```bash
# Exportar DB
docker compose -f docker-compose.qnap.yml exec db pg_dump -U tagmap_user tagmap_db > backup_$(date +%Y%m%d).sql

# Restaurar DB
docker compose -f docker-compose.qnap.yml exec -T db psql -U tagmap_user tagmap_db < backup.sql
```

---

## Actualizar TagMap desde GitHub

Si no tienes Git instalado en el QNAP, puedes usar un contenedor de Docker para actualizar el código.

### Método automático: Script de actualización (recomendado)

```bash
cd /share/homes/DavidPrado/tagmap

# Dar permisos de ejecución
chmod +x update-qnap.sh

# Ejecutar actualización
./update-qnap.sh
```

El script hace automáticamente:
- ✅ Backup del archivo `.env`
- ✅ Descarga actualizaciones desde GitHub
- ✅ Reconstruye contenedores
- ✅ Ejecuta migraciones de base de datos
- ✅ Muestra resumen de cambios

### Método 1: Usando contenedor alpine/git (sin Git instalado)

```bash
# Navegar al proyecto
cd /share/homes/DavidPrado/tagmap

# 1. Hacer backup del archivo .env
cp .env .env.backup

# 2. Actualizar código usando contenedor Git
docker run --rm \
  -v /share/homes/DavidPrado/tagmap:/git \
  alpine/git -C /git pull origin main

# Si estás usando la rama folder-concept:
docker run --rm \
  -v /share/homes/DavidPrado/tagmap:/git \
  alpine/git -C /git pull origin folder-concept

# 3. Restaurar el .env (por si se sobrescribió)
cp .env.backup .env

# 4. Reconstruir y reiniciar contenedores
sudo docker compose -f docker-compose.qnap.yml down
sudo docker compose -f docker-compose.qnap.yml up -d --build

# 5. Ejecutar migraciones si hay cambios en la BD
sudo docker compose -f docker-compose.qnap.yml exec backend npm run db:migrate
```

### Método 2: Usando Git nativo (si está instalado)

```bash
cd /share/homes/DavidPrado/tagmap

# Hacer backup del .env
cp .env .env.backup

# Actualizar desde GitHub
git pull origin main

# Restaurar .env
cp .env.backup .env

# Reconstruir contenedores
sudo docker compose -f docker-compose.qnap.yml down
sudo docker compose -f docker-compose.qnap.yml up -d --build

# Ejecutar migraciones
sudo docker compose -f docker-compose.qnap.yml exec backend npm run db:migrate
```

### Método 3: Ver cambios antes de actualizar

```bash
# Ver commits nuevos disponibles
docker run --rm \
  -v /share/homes/DavidPrado/tagmap:/git \
  alpine/git -C /git fetch origin

docker run --rm \
  -v /share/homes/DavidPrado/tagmap:/git \
  alpine/git -C /git log HEAD..origin/main --oneline

# Si los cambios te convencen, hacer pull
docker run --rm \
  -v /share/homes/DavidPrado/tagmap:/git \
  alpine/git -C /git pull origin main
```

### Solución de problemas al actualizar

**Error: "Your local changes would be overwritten"**

Esto significa que has modificado archivos localmente. Opciones:

```bash
# Opción A: Descartar cambios locales (¡cuidado!)
docker run --rm \
  -v /share/homes/DavidPrado/tagmap:/git \
  alpine/git -C /git reset --hard origin/main

# Opción B: Guardar cambios locales en un stash
docker run --rm \
  -v /share/homes/DavidPrado/tagmap:/git \
  alpine/git -C /git stash

docker run --rm \
  -v /share/homes/DavidPrado/tagmap:/git \
  alpine/git -C /git pull origin main

# Recuperar cambios guardados
docker run --rm \
  -v /share/homes/DavidPrado/tagmap:/git \
  alpine/git -C /git stash pop
```

**Error: "Permission denied" al usar Docker**

```bash
# Ejecutar con sudo
sudo docker run --rm \
  -v /share/homes/DavidPrado/tagmap:/git \
  alpine/git -C /git pull origin main
```

---

## Acceso externo (opcional)

### Opción 1: Port forwarding en el router

1. Abre los puertos 3000 en tu router
2. Redirige al NAS (192.168.1.100:3000)
3. Accede desde fuera con: `http://<TU-IP-PUBLICA>:3000`

### Opción 2: Cloudflare Tunnel (recomendado)

Ver [DEPLOY-QNAP.md](DEPLOY-QNAP.md) para configuración completa de Cloudflare Tunnel.

---

## Siguiente paso

Una vez que TagMap funcione correctamente, puedes integrar con OneDrive usando Power Automate. Ver [ONEDRIVE-POWER-AUTOMATE.md](ONEDRIVE-POWER-AUTOMATE.md) para configurar subida automática desde los móviles de los trabajadores.
