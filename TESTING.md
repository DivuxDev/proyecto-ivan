# Guía de pruebas — TagMap con Folder Watcher

Instrucciones para probar TagMap localmente antes de desplegar en el NAS QNAP.

---

## Prueba local en tu PC (Windows/Mac/Linux)

### Requisitos

- Docker Desktop instalado
- Git instalado
- Al menos 4GB RAM libres
- 10GB espacio en disco

---

## Paso 1 — Clonar y configurar

### 1.1 Clonar el repositorio

```bash
# Cambiar a la rama folder-concept
git clone -b folder-concept https://github.com/DivuxDev/tagmap.git
cd tagmap
```

### 1.2 Crear el archivo .env

**Windows (PowerShell):**
```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

**Mac/Linux:**
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 1.3 Generar JWT_SECRET

**Windows (PowerShell):**
```powershell
# Generar 64 caracteres hex
-join ((0..63) | ForEach-Object { "{0:x}" -f (Get-Random -Max 16) })
```

**Mac/Linux:**
```bash
openssl rand -hex 32
```

Copia el resultado y edita `backend/.env`:

```env
JWT_SECRET=TU_SECRET_AQUI
```

### 1.4 Crear carpetas de prueba para equipos

**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Force -Path "watch_folders\Equipo-Norte"
New-Item -ItemType Directory -Force -Path "watch_folders\Equipo-Sur"
New-Item -ItemType Directory -Force -Path "watch_folders\Equipo-Centro"
```

**Mac/Linux:**
```bash
mkdir -p watch_folders/Equipo-Norte
mkdir -p watch_folders/Equipo-Sur
mkdir -p watch_folders/Equipo-Centro
```

### 1.5 Editar docker-compose.yml (solo para prueba local)

Abre `docker-compose.yml` y modifica la sección de volúmenes del backend:

```yaml
services:
  backend:
    # ... otras configuraciones
    volumes:
      - uploads_data:/app/uploads
      # En lugar de esto:
      # - ${WATCH_FOLDERS_PATH:-watch_folders_data}:/share/TagMapFotos
      # Usa esto (ruta relativa):
      - ./watch_folders:/share/TagMapFotos
```

---

## Paso 2 — Levantar la aplicación

### 2.1 Build y arranque

```bash
docker compose up -d --build
```

> Primera vez: tarda 5-10 minutos.

### 2.2 Ver logs

```bash
docker compose logs -f
```

Busca:

```
⚡ TagMap API arrancada
   🚀 http://localhost:4000
📂 Folder watcher iniciado
   Directorio: /share/TagMapFotos
   Intervalo: 60s
```

### 2.3 Inicializar base de datos

```bash
# Migraciones
docker compose exec backend npm run db:migrate

# Crear usuario admin
docker compose exec backend npm run db:seed
```

---

## Paso 3 — Probar la interfaz

### 3.1 Abrir navegador

```
http://localhost:3000
```

### 3.2 Login

- Email: `admin@tagmap.app`
- Password: `admin123`

Deberías ver el dashboard vacío.

---

## Paso 4 — Probar subida manual (modo tradicional)

### 4.1 Crear un usuario worker

1. **Dashboard** → **Usuarios** → **Nuevo usuario**
2. Completa:
   - Nombre: `Test Worker`
   - Email: `test@worker.com`
   - Password: `test123`
   - Rol: `WORKER`
3. Guardar

### 4.2 Login como worker

1. Cerrar sesión (menú superior derecho)
2. Login con `test@worker.com` / `test123`
3. Ir a **Subir fotos**
4. Subir una foto JPG con GPS (tomada con móvil)
5. Ver que aparece en **Historial**

### 4.3 Volver como admin

1. Cerrar sesión
2. Login como `admin@tagmap.app`
3. **Dashboard** → **Fotos** → ver la foto subida
4. **Dashboard** → **Mapa** → ver la foto en el mapa

✅ **Si funciona, el modo tradicional está OK.**

---

## Paso 5 — Probar Folder Watcher (modo automático)

### 5.1 Preparar foto de prueba

Copia una foto JPG tomada con tu móvil (con GPS) a:

**Windows:**
```powershell
Copy-Item "C:\Ruta\A\Tu\Foto.jpg" "watch_folders\Equipo-Norte\"
```

**Mac/Linux:**
```bash
cp ~/ruta/a/tu/foto.jpg watch_folders/Equipo-Norte/
```

### 5.2 Ver logs del backend

```bash
docker compose logs -f backend
```

Espera máximo 60 segundos. Deberías ver:

```
🔍 Escaneando carpetas en /share/TagMapFotos...

📁 Procesando: Equipo-Norte
   👤 Usuario virtual creado: Equipo-Norte
   ✅ Foto.jpg
   Importadas: 1 | Errores: 0

📊 Total: 1 importadas, 0 errores
```

### 5.3 Verificar en la app

1. Refresca el navegador
2. **Dashboard** → **Usuarios** → deberías ver un usuario "Equipo-Norte"
3. **Dashboard** → **Fotos** → ver la foto con usuario "Equipo-Norte"
4. **Dashboard** → **Mapa** → ver la foto en el mapa

### 5.4 Verificar que se movió a procesadas

**Windows (PowerShell):**
```powershell
Get-ChildItem "watch_folders\Equipo-Norte\procesadas\"
```

**Mac/Linux:**
```bash
ls -la watch_folders/Equipo-Norte/procesadas/
```

Deberías ver `Foto.jpg` allí.

✅ **Si todo esto funciona, el Folder Watcher está OK.**

---

## Paso 6 — Probar con múltiples equipos

### 6.1 Subir fotos a diferentes equipos

```bash
# Copia fotos a cada carpeta de equipo
cp foto1.jpg watch_folders/Equipo-Norte/
cp foto2.jpg watch_folders/Equipo-Sur/
cp foto3.jpg watch_folders/Equipo-Centro/
```

### 6.2 Ver logs

```bash
docker compose logs -f backend
```

Deberías ver 3 equipos procesados:

```
📁 Procesando: Equipo-Norte
   ✅ foto1.jpg
📁 Procesando: Equipo-Sur
   ✅ foto2.jpg
📁 Procesando: Equipo-Centro
   ✅ foto3.jpg

📊 Total: 3 importadas, 0 errores
```

### 6.3 Verificar en la app

**Dashboard → Usuarios** deberías ver 3 usuarios virtuales:
- Equipo-Norte
- Equipo-Sur
- Equipo-Centro

**Dashboard → Fotos** deberías ver 3 fotos (1 por equipo)

**Dashboard → Mapa** deberías ver las 3 fotos si tienen GPS

---

## Paso 7 — Probar detección de duplicados

### 7.1 Subir la misma foto dos veces

```bash
# Copia la misma foto otra vez
cp foto1.jpg watch_folders/Equipo-Norte/misma-foto.jpg
```

### 7.2 Ver logs

Deberías ver:

```
⚠️  misma-foto.jpg ya existe (hash duplicado), omitiendo
```

### 7.3 Verificar

La foto NO debería duplicarse en la app. Solo debe haber 1 instancia de `foto1.jpg`.

✅ **Si no se duplica, la detección funciona.**

---

## Paso 8 — Probar foto sin GPS

### 8.1 Subir foto sin metadatos GPS

Copia una foto cualquiera sin GPS (screenshot, foto editada, etc.):

```bash
cp foto-sin-gps.jpg watch_folders/Equipo-Norte/
```

### 8.2 Ver logs

```
⚠️  foto-sin-gps.jpg no tiene coordenadas GPS, guardada sin ubicación
```

### 8.3 Verificar en la app

**Dashboard → Fotos** → la foto aparece pero **sin coordenadas** (lat: null, lon: null)

**Dashboard → Mapa** → la foto NO aparece en el mapa

✅ **Comportamiento esperado.**

---

## Paso 9 — Probar exportación

### 9.1 Exportar CSV

1. **Dashboard** → **Fotos**
2. Botón **Exportar CSV** (arriba a la derecha)
3. Se descarga `fotos_tagmap_YYYY-MM-DD.csv`

### 9.2 Verificar contenido

Abre el CSV con Excel o LibreOffice. Debería tener columnas:

- ID
- Usuario
- Latitud
- Longitud
- Fecha de subida
- URL de la imagen

✅ **Si el CSV tiene datos correctos, la exportación funciona.**

---

## Paso 10 — Limpiar y parar

### 10.1 Parar contenedores

```bash
docker compose down
```

### 10.2 Limpiar volúmenes (opcional, borra todo)

```bash
docker compose down -v
```

> ⚠️ Esto borra la base de datos y todas las fotos subidas.

### 10.3 Borrar carpetas de prueba (opcional)

**Windows:**
```powershell
Remove-Item -Recurse -Force watch_folders
```

**Mac/Linux:**
```bash
rm -rf watch_folders
```

---

## Troubleshooting de pruebas locales

### Puerto 3000 ya en uso

Edita `docker-compose.yml`:

```yaml
frontend:
  ports:
    - "3001:3000"  # Cambiar a 3001
```

Acceso: `http://localhost:3001`

### Backend no conecta a DB

```bash
# Ver logs del backend
docker compose logs backend

# Ver logs de la DB
docker compose logs db
```

Si ves `ECONNREFUSED`, espera 30 segundos a que PostgreSQL arranque completamente.

### El Folder Watcher no detecta fotos

1. Verifica que `ENABLE_FOLDER_WATCHER=true` en `backend/.env`
2. Verifica el volumen en `docker-compose.yml`:
   ```yaml
   - ./watch_folders:/share/TagMapFotos
   ```
3. Verifica que las carpetas existen:
   ```bash
   ls -la watch_folders/
   ```
4. Verifica los logs:
   ```bash
   docker compose logs -f backend | grep -i folder
   ```

### Las fotos se importan pero no tienen ubicación

La foto debe tener EXIF GPS embebido. Verifica con:

- [Jeffrey's Image Metadata Viewer](http://exif.regex.info/exif.cgi)
- O con herramienta local: `exiftool foto.jpg | grep GPS`

---

## Checklist de pruebas completadas

Antes de desplegar en producción (QNAP NAS), verifica:

- [ ] Login admin funciona
- [ ] Crear usuario worker funciona
- [ ] Subida manual de foto funciona (modo tradicional)
- [ ] Folder Watcher detecta fotos automáticamente
- [ ] Usuarios virtuales se crean correctamente
- [ ] Fotos se mueven a carpeta `procesadas/`
- [ ] Duplicados se detectan correctamente
- [ ] Fotos aparecen en el mapa (si tienen GPS)
- [ ] Fotos sin GPS se guardan pero sin ubicación
- [ ] Exportar CSV funciona
- [ ] Logs no muestran errores críticos

Si todo está ✅, estás listo para [desplegar en QNAP](DEPLOY-QNAP.md).

---

## Próximos pasos

1. **Desplegar en QNAP:** Sigue [DEPLOY-QNAP.md](DEPLOY-QNAP.md)
2. **Configurar acceso externo:** Cloudflare Tunnel para HTTPS
3. **Configurar backup:** Exportación automática de DB diaria
4. **Integrar OneDrive:** Power Automate para subida desde móviles

---

¡Pruebas completadas! 🚀 Ahora tienes confianza de que el sistema funciona antes de llevarlo a producción.
