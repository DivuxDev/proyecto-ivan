# Guía de despliegue en QNAP NAS — TagMap con Folder Watcher

Guía completa para desplegar TagMap en un NAS QNAP con Container Station, incluyendo el modo Folder Watcher para importación automática de fotos.

---

## Requisitos previos

### Hardware mínimo
- QNAP NAS con procesador x86-64 (Intel/AMD)
- 2GB RAM mínimo (4GB recomendado)
- 10GB espacio libre para Docker + app
- Espacio adicional según volumen de fotos

### Software necesario
- QTS 4.5 o superior
- **Container Station** instalado (App Center → buscar Container Station → Instalar)
- Acceso SSH habilitado (Panel de Control → Telnet/SSH)
- Git instalado (opcional, se puede clonar desde otro PC)

### Información que necesitas tener
- IP del NAS en tu red local (ej. `192.168.1.100`)
- Usuario admin del NAS + contraseña
- Dominio propio (opcional, para acceso externo con HTTPS)

---

## Paso 1 — Preparar las carpetas compartidas

### 1.1 Carpeta para las fotos de la aplicación

1. **File Station** → botón derecho en el panel izquierdo → **Crear carpeta compartida**
   - Nombre: `TagMapUploads`
   - Permisos: admin → lectura/escritura

### 1.2 Carpeta para las carpetas de equipos (Folder Watcher)

1. **File Station** → botón derecho → **Crear carpeta compartida**
   - Nombre: `TagMapFotos`
   - Permisos: admin → lectura/escritura

2. Dentro de `TagMapFotos`, crea las carpetas de los equipos:
   ```
   /share/TagMapFotos/
     ├── Equipo-Norte/
     ├── Equipo-Sur/
     └── Equipo-Centro/
   ```

> Cada carpeta representa un equipo. El nombre será el nombre del "usuario virtual" en la app.

---

## Paso 2 — Habilitar SSH y conectar

### 2.1 Habilitar SSH

1. **Panel de Control** → **Servicios de red** → **Telnet / SSH**
2. Marca **"Permitir conexiones SSH"**
3. Puerto: `22` (por defecto)
4. Aplicar

### 2.2 Conectar desde tu PC

**Windows (PowerShell):**
```powershell
ssh admin@192.168.1.100
```

**Mac/Linux:**
```bash
ssh admin@192.168.1.100
```

Introduce tu contraseña de admin cuando te la pida.

---

## Paso 3 — Instalar Git en el NAS

Git es necesario para clonar el repositorio y usar el script `update.sh`. Hay varias opciones:

### Opción A — Desde App Center (más fácil)

1. Abre **App Center** en tu QNAP
2. Busca **"Git Server"** o **"Qgit"**
3. Instalar
4. Verificar en SSH:
   ```bash
   ssh admin@192.168.1.100
   git --version
   ```

### Opción B — Via Entware (recomendado, más actualizado)

Entware es un gestor de paquetes para NAS QNAP similar a apt/yum.

```bash
# 1. Conectar via SSH como admin
ssh admin@192.168.1.100

# 2. Instalar Entware (si no está instalado)
# Método 1: Descargar y ejecutar por separado (más confiable)
wget http://bin.entware.net/x64-k3.2/installer/generic.sh

# IMPORTANTE: Ejecutar con sudo o como root
sudo sh generic.sh
# O si no funciona sudo:
su -c "sh generic.sh"

# Si falla con "Broken pipe", usa Método 2:
# Método 2: Con curl
curl -fsSL http://bin.entware.net/x64-k3.2/installer/generic.sh | sudo sh

# Si tu NAS es ARM en vez de x86-64, usa:
# wget http://bin.entware.net/armv7sf-k3.2/installer/generic.sh
# sudo sh generic.sh

# 3. Añadir Entware al PATH
export PATH=/opt/bin:/opt/sbin:$PATH
echo 'export PATH=/opt/bin:/opt/sbin:$PATH' >> ~/.profile

# 4. Actualizar repositorios de Entware
opkg update

# 5. Instalar git
opkg install git git-http

# 6. Verificar instalación
git --version
# Debería mostrar: git version 2.x.x
```

### Opción C — Container con Git (si no quieres instalar en el NAS)

Usa un contenedor temporal de Docker:

```bash
# 1. Crear carpeta temporal
mkdir -p /share/homes/admin/tagmap

# 2. Clonar con Docker
docker run --rm -v $HOME:/workspace alpine/git \
  clone -b folder-concept https://github.com/DivuxDev/tagmap.git \
  /workspace/tagmap

# Nota: No podrás usar update.sh con este método
```

### Solución de problemas Git

**Error: "Permission denied" al instalar Entware**
```bash
# Ejecutar con sudo (permisos de administrador)
sudo sh generic.sh

# Si sudo no funciona, cambiar a root:
su -
sh generic.sh
exit

# En algunos QNAP, necesitas habilitar sudo primero:
# Panel de Control → Usuarios → Permitir sudo para admin
```

**Error: "Broken pipe" al instalar Entware**
```bash
# Descarga el script primero, luego ejecútalo
wget http://bin.entware.net/x64-k3.2/installer/generic.sh
sudo sh generic.sh

# O usa curl en vez de wget
curl -fsSL http://bin.entware.net/x64-k3.2/installer/generic.sh | sudo sh
```

**Error: "git: command not found" tras instalar Entware**
```bash
# Verificar PATH
echo $PATH

# Añadir Entware al PATH (si instalaste via Entware)
export PATH=/opt/bin:/opt/sbin:$PATH

# Hacer permanente añadiendo a ~/.profile
echo 'export PATH=/opt/bin:/opt/sbin:$PATH' >> ~/.profile
source ~/.profile

# Verificar que opkg funciona
opkg --version
```

**Error: "Permission denied (publickey)"**
```bash
# Usar HTTPS en vez de SSH
git clone https://github.com/tu-usuario/tagmap.git
```

**Verificar arquitectura del NAS**
```bash
# Ver arquitectura de tu NAS
uname -m

# x86_64 → usa x64-k3.2
# armv7l → usa armv7sf-k3.2
# aarch64 → usa aarch64-k3.2
```

---

## Paso 4 — Clonar el repositorio

Una vez que Git esté instalado:

```bash
# Ir a la carpeta de tu usuario
cd /share/homes/admin

# Clonar el repositorio (rama folder-concept)
git clone -b folder-concept https://github.com/DivuxDev/tagmap.git

# Entrar al proyecto
cd tagmap

# Verificar que está la rama correcta
git branch
# Debería mostrar: * folder-concept
```

### Alternativa — Subir desde tu PC sin Git

Si no quieres instalar Git en el NAS:

```bash
# En tu PC
git clone -b folder-concept https://github.com/DivuxDev/tagmap.git
cd tagmap

# Comprimir
tar -czf tagmap.tar.gz .

# Subir al NAS usando FileZilla o el File Station web
# Destino: /share/homes/admin/tagmap/
```

---

## Paso 5 — Configurar variables de entorno

### 5.1 Crear el archivo .env

```bash
cd /share/homes/admin/tagmap
nano .env
```

### 5.2 Contenido del .env

```env
# Base de datos
POSTGRES_USER=tagmap_user
POSTGRES_PASSWORD=TuPasswordSegura123!
POSTGRES_DB=tagmap_db
DATABASE_URL=postgresql://tagmap_user:TuPasswordSegura123!@db:5432/tagmap_db

# JWT - Genera uno con: openssl rand -hex 32
JWT_SECRET=PEGA_AQUI_UN_SECRET_ALEATORIO_DE_64_CARACTERES
JWT_EXPIRES_IN=24h

# CORS - URL pública de acceso (ajustar después si usas dominio)
CORS_ORIGIN=http://192.168.1.100:3000

# Rutas de carpetas compartidas del NAS
UPLOADS_PATH=/share/TagMapUploads
WATCH_FOLDERS_PATH=/share/TagMapFotos

# Folder Watcher - HABILITAR PARA IMPORTACIÓN AUTOMÁTICA
ENABLE_FOLDER_WATCHER=true
WATCH_FOLDERS_DIR=/share/TagMapFotos
SCAN_INTERVAL_SECONDS=60
```

**Guardar:** `Ctrl + O` → Enter → `Ctrl + X`

### 5.3 Generar JWT_SECRET

```bash
openssl rand -hex 32
```

Copia el resultado y pégalo en `JWT_SECRET` del `.env`.

---

## Paso 6 — Editar docker-compose.yml (adaptación QNAP)

El `docker-compose.yml` ya está preparado, solo verifica que las rutas sean correctas:

```bash
nano docker-compose.yml
```

Busca la sección `backend → volumes` y verifica:

```yaml
volumes:
  - /share/TagMapUploads:/app/uploads
  - /share/TagMapFotos:/share/TagMapFotos
```

Si todo está bien, guarda y cierra.

---

## Paso 7 — Levantar la aplicación

### 7.1 Build y arranque

```bash
cd /share/homes/admin/tagmap
docker compose up -d --build
```

> La primera vez tardará 5-10 minutos compilando las imágenes.

### 7.2 Verificar que los contenedores están corriendo

```bash
docker compose ps
```

Deberías ver 3 servicios en estado `running`:
- `tagmap-db-1`
- `tagmap-backend-1`
- `tagmap-frontend-1`

### 7.3 Ver logs en tiempo real

```bash
docker compose logs -f
```

Busca estas líneas para confirmar que todo arrancó bien:

```
⚡ TagMap API arrancada
   🚀 http://localhost:4000
📂 Folder watcher iniciado
   Directorio: /share/TagMapFotos
   Intervalo: 60s
```

Para salir de los logs: `Ctrl + C`

---

## Paso 8 — Inicializar la base de datos

### 8.1 Ejecutar migraciones

```bash
docker compose exec backend npm run db:migrate
```

> Esto crea las tablas en PostgreSQL.

### 8.2 Crear usuario admin inicial

```bash
docker compose exec backend npm run db:seed
```

Verás:

```
✅ Seed completado:
   👤 Admin: admin@tagmap.app / admin123
   👷 Trabajadores (pass: worker123):
      - carlos@tagmap.app
      - pedro@tagmap.app
      ...
```

---

## Paso 9 — Probar la aplicación

### 9.1 Acceder desde el navegador

Abre en tu navegador:

```
http://192.168.1.100:3000
```

> Cambia `192.168.1.100` por la IP real de tu NAS.

### 9.2 Hacer login

- Email: `admin@tagmap.app`
- Contraseña: `admin123`

Si entras correctamente, verás el dashboard admin vacío (sin fotos todavía).

### 9.3 Cambiar contraseña del admin

1. **Dashboard** → **Usuarios**
2. Busca el admin → botón del candado (cambiar contraseña)
3. Pon una contraseña segura

---

## Paso 10 — Probar el Folder Watcher

### 10.1 Subir una foto de prueba

Desde tu PC, abre el File Station del NAS (web o app):

1. Navega a `TagMapFotos/Equipo-Norte/`
2. Arrastra una foto JPG tomada con tu móvil (que tenga GPS en el EXIF)
3. Espera 60 segundos (el intervalo de escaneo)

### 10.2 Ver los logs del backend

```bash
docker compose logs -f backend
```

Deberías ver algo como:

```
🔍 Escaneando carpetas en /share/TagMapFotos...

📁 Procesando: Equipo-Norte
   👤 Usuario virtual creado: Equipo-Norte
   ✅ tu-foto.jpg
   Importadas: 1 | Errores: 0

📊 Total: 1 importadas, 0 errores
```

### 10.3 Verificar en la app

1. Refresca el navegador (`F5`)
2. **Dashboard** → **Fotos**
3. Deberías ver tu foto con el usuario "Equipo-Norte"
4. **Dashboard** → **Mapa** → la foto aparece en el mapa si tenía GPS

### 10.4 Verificar que la foto se movió

Vuelve al File Station:

```
TagMapFotos/Equipo-Norte/procesadas/tu-foto.jpg  ← la foto está aquí ahora
```

✅ **Si ves todo esto, el Folder Watcher está funcionando correctamente.**

---

## Paso 11 — Acceso externo con Cloudflare Tunnel (recomendado)

Si quieres acceder desde internet con HTTPS sin abrir puertos en el router:

### 11.1 Requisitos

- Dominio propio con DNS en Cloudflare (gratis)
- Cuenta en [dash.cloudflare.com](https://dash.cloudflare.com)

### 11.2 Crear el túnel

1. Ve a **dash.cloudflare.com** → **Zero Trust** → **Networks** → **Tunnels**
2. **Create a tunnel** → nombre: `tagmap`
3. Copia el **token** (cadena larga que empieza por `eyJ...`)
4. En **Public Hostname** configura:
   - Subdomain: `tagmap`
   - Domain: `tudominio.com`
   - Service: `http://localhost:3000`
5. Guarda

### 11.3 Ejecutar cloudflared en el NAS

Desde SSH en el NAS:

```bash
docker run -d \
  --name cloudflared \
  --restart unless-stopped \
  --network host \
  cloudflare/cloudflared:latest \
  tunnel --no-autoupdate run --token TU_TOKEN_AQUI
```

> Sustituye `TU_TOKEN_AQUI` por el token que copiaste.

### 11.4 Verificar que conectó

```bash
docker logs cloudflared
```

Busca: `Registered tunnel connection`

### 11.5 Actualizar CORS_ORIGIN

Edita el `.env`:

```bash
nano /share/homes/admin/tagmap/.env
```

Cambia:

```env
CORS_ORIGIN=https://tagmap.tudominio.com
```

Reinicia el backend:

```bash
docker compose restart backend
```

### 11.6 Probar acceso externo

Desde tu móvil (datos móviles, no WiFi local):

```
https://tagmap.tudominio.com
```

Deberías ver la pantalla de login con HTTPS válido.

---

## Paso 12 — Integración con OneDrive (opcional)

Si quieres que los trabajadores suban fotos desde el móvil automáticamente:

### Flujo completo

```
📱 Móvil worker
    ↓ OneDrive auto-sync de cámara
☁️  OneDrive
    ↓ Power Automate (detecta nueva foto)
📂 NAS QNAP (/share/TagMapFotos/Equipo-Norte/)
    ↓ Folder Watcher (cada 60s)
💾 Base de datos TagMap
```

### Configurar Power Automate

Ver documentación completa en `FOLDER-WATCHER.md` sección **"Flujo completo con OneDrive + Power Automate"**.

Resumen:
1. Worker instala OneDrive en el móvil
2. Activa "Carga de cámara"
3. Creas un flujo en Power Automate:
   - Trigger: nueva foto en OneDrive
   - Action: copiar a Samba/SMB del NAS (`\\192.168.1.100\TagMapFotos\Equipo-Norte\`)
   - Action: mover original en OneDrive a "Procesadas"

El Folder Watcher detectará la foto en el NAS y la importará automáticamente.

---

## Paso 12 — Configurar backup automático

### 12.1 Backup de la base de datos

Crea un script para exportar la DB diariamente:

```bash
nano /share/homes/admin/backup-tagmap.sh
```

Contenido:

```bash
#!/bin/bash
BACKUP_DIR="/share/Backups/TagMap"
DATE=$(date +%Y%m%d_%H%M%S)

# Crear carpeta si no existe
mkdir -p $BACKUP_DIR

# Exportar base de datos
cd /share/homes/admin/tagmap
docker compose exec -T db pg_dump -U tagmap_user tagmap_db > $BACKUP_DIR/db_$DATE.sql

# Borrar backups antiguos (más de 30 días)
find $BACKUP_DIR -name "db_*.sql" -mtime +30 -delete

echo "Backup completado: $BACKUP_DIR/db_$DATE.sql"
```

Darle permisos de ejecución:

```bash
chmod +x /share/homes/admin/backup-tagmap.sh
```

### 12.2 Programar con cron

```bash
crontab -e
```

Añadir al final:

```cron
# Backup diario de TagMap a las 3:00 AM
0 3 * * * /share/homes/admin/backup-tagmap.sh >> /tmp/tagmap-backup.log 2>&1
```

Guardar y salir.

### 12.3 Backup de las fotos

Las fotos están en `/share/TagMapUploads/` — puedes usar:

- **HBS 3** (Hybrid Backup Sync) de QNAP → configurar job de sincronización a nube (Google Drive, Dropbox, etc.)
- O simplemente cron + rsync a otro servidor

---

## Paso 13 — Monitorización y mantenimiento

### Ver uso de recursos

```bash
# CPU y RAM de cada contenedor
docker stats

# Espacio usado por volúmenes Docker
docker system df
```

### Ver logs de errores

```bash
# Solo errores del backend
docker compose logs backend | grep -i error

# Últimas 50 líneas
docker compose logs --tail=50 backend
```

### Reiniciar servicios

```bash
# Solo el backend
docker compose restart backend

# Toda la aplicación
docker compose restart
```

### Actualizar a nueva versión

```bash
cd /share/homes/admin/tagmap
git pull origin folder-concept
docker compose up -d --build
```

---

## Paso 14 — Troubleshooting común

### Los contenedores no arrancan

```bash
# Ver por qué falló
docker compose logs backend
docker compose logs frontend
docker compose logs db
```

Causas comunes:
- Puerto 3000 ya ocupado → cambia en docker-compose.yml
- Permisos en carpetas compartidas → verifica con `ls -la /share/TagMapUploads`
- `.env` mal configurado → revisa que DATABASE_URL coincida con POSTGRES_USER/PASSWORD/DB

### El Folder Watcher no importa fotos

Verifica:

1. `ENABLE_FOLDER_WATCHER=true` en el `.env`
2. Las carpetas existen en `/share/TagMapFotos/`
3. Las fotos son `.jpg`, `.jpeg` o `.png`
4. Los archivos no están en subcarpetas (solo en la raíz de cada equipo)
5. Logs del backend: `docker compose logs -f backend`

### No puedo acceder desde otro dispositivo

1. Verifica que el puerto 3000 está abierto en el firewall del NAS
2. **Panel de Control** → **Seguridad** → **Cortafuegos** → añadir regla para puerto 3000
3. Prueba con: `http://IP_DEL_NAS:3000`

### Las fotos no tienen coordenadas GPS

- La foto debe tener EXIF GPS embebido (tomada con móvil con GPS activo)
- Verifica con: [Jeffrey's Image Metadata Viewer](http://exif.regex.info/exif.cgi)
- Si el EXIF fue borrado (compartida desde WhatsApp, redes sociales), no hay GPS

### El backend reinicia constantemente

```bash
docker compose logs backend
```

Busca errores como:
- `ECONNREFUSED` → la DB no está lista, espera 30s y reintenta
- `Authentication failed` → credenciales incorrectas en DATABASE_URL

---

## Paso 15 — Crear usuarios reales

Una vez todo funciona, crea los usuarios de tu empresa:

1. Login como admin: `https://tagmap.tudominio.com`
2. **Dashboard** → **Usuarios** → **Nuevo usuario**
3. Completa:
   - Nombre: `Juan Pérez`
   - Email: `juan@empresa.com`
   - Contraseña: (temporal, que la cambien al primer login)
   - Rol: `WORKER`
   - Teléfono: `+34 600 123 456`
4. Guardar

Repite para cada trabajador.

---

## Checklist final de producción

- [ ] Aplicación accesible en `http://IP_NAS:3000` desde la red local
- [ ] Acceso externo configurado con Cloudflare Tunnel (HTTPS)
- [ ] Usuario admin con contraseña segura cambiada
- [ ] Folder Watcher funcionando (foto de prueba importada correctamente)
- [ ] Usuarios reales creados
- [ ] Backup automático configurado (cron + script)
- [ ] Logs revisados sin errores críticos
- [ ] Documentación entregada al cliente
- [ ] Formación realizada (2h)

---

## Comandos de referencia rápida

```bash
# Ver estado de contenedores
docker compose ps

# Ver logs en tiempo real
docker compose logs -f

# Reiniciar todo
docker compose restart

# Parar aplicación
docker compose down

# Levantar tras cambios
docker compose up -d --build

# Entrar al contenedor del backend
docker compose exec backend sh

# Backup manual de DB
docker compose exec db pg_dump -U tagmap_user tagmap_db > backup.sql

# Restaurar DB
docker compose exec -T db psql -U tagmap_user tagmap_db < backup.sql
```

---

## Soporte y recursos

- **Documentación Folder Watcher:** [FOLDER-WATCHER.md](FOLDER-WATCHER.md)
- **Documentación general:** [README.md](README.md)
- **Guía técnica:** [CLAUDE.md](CLAUDE.md)
- **Repositorio:** https://github.com/DivuxDev/tagmap
- **Rama Folder Watcher:** `folder-concept`

---

## Próximos pasos opcionales

Una vez en producción y funcionando:

1. **Configurar SSL local** con certificado Let's Encrypt
2. **Añadir más equipos** creando carpetas en `/share/TagMapFotos/`
3. **Integrar con Power Automate** para subida automática desde OneDrive
4. **Montar alertas** con scripts que notifiquen si el servicio cae
5. **Escalar a varios NAS** si el volumen de fotos crece mucho

---

¡Listo! TagMap debería estar funcionando en tu QNAP con el Folder Watcher activo, importando fotos automáticamente desde las carpetas de equipos. 🚀
