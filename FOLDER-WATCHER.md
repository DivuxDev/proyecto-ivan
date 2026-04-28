# Folder Watcher — Modo de importación automática por carpetas

Esta funcionalidad permite que TagMap importe automáticamente fotos organizadas en carpetas del NAS, sin necesidad de que los trabajadores inicien sesión en la aplicación web.

---

## Caso de uso

Ideal para equipos que:
- Suben fotos a carpetas compartidas (OneDrive, Samba, NFS, etc.)
- Prefieren organización por carpetas en lugar de usuarios individuales
- Usan Power Automate/scripts para sincronizar fotos desde móviles al NAS

---

## Cómo funciona

1. Cada equipo/responsable tiene una carpeta en el NAS
2. Las fotos se depositan en esas carpetas (manualmente, OneDrive, etc.)
3. TagMap escanea periódicamente las carpetas
4. Por cada foto nueva:
   - Extrae GPS del EXIF
   - Optimiza la imagen (Sharp)
   - La guarda en la base de datos
   - Mueve el original a `carpeta/procesadas/`
5. En el panel admin, las fotos aparecen agrupadas por "equipo" (nombre de carpeta)

---

## Estructura de carpetas requerida

```
/share/TagMapFotos/
  ├── Equipo-Norte/
  │   ├── foto1.jpg        ← detectada, procesada
  │   ├── foto2.jpg        ← detectada, procesada
  │   └── procesadas/      ← creada automáticamente
  │       ├── foto1.jpg    ← movida tras importar
  │       └── foto2.jpg    ← movida tras importar
  ├── Equipo-Sur/
  │   ├── IMG_001.jpg
  │   └── procesadas/
  │       └── IMG_001.jpg
  └── Equipo-Centro/
      └── DCIM_1234.jpg
```

### Reglas

✅ El nombre de la carpeta = nombre del equipo en la aplicación  
✅ Solo se procesan archivos `.jpg`, `.jpeg`, `.png` en la raíz de cada carpeta  
✅ Los archivos procesados se mueven a `carpeta/procesadas/` automáticamente  
✅ Si detecta un duplicado (mismo hash MD5), lo omite  
✅ Carpetas ocultas (empiezan por `.`) se ignoran  

---

## Configuración

### 1. Variables de entorno

Añade al `.env` o a las variables de Coolify:

```env
# Habilitar el watcher
ENABLE_FOLDER_WATCHER=true

# Ruta donde están las carpetas de equipos
WATCH_FOLDERS_DIR=/share/TagMapFotos

# Intervalo de escaneo en segundos (por defecto 60)
SCAN_INTERVAL_SECONDS=60
```

### 2. Docker Compose

Si usas Docker Compose, asegúrate de montar la carpeta de equipos:

```yaml
services:
  backend:
    environment:
      ENABLE_FOLDER_WATCHER: true
      WATCH_FOLDERS_DIR: /share/TagMapFotos
      SCAN_INTERVAL_SECONDS: 60
    volumes:
      - uploads_data:/app/uploads
      - /ruta/real/TagMapFotos:/share/TagMapFotos  # ← bind mount
```

### 3. QNAP Container Station

Edita la configuración del stack y añade el volumen:

```
Volumen host: /share/TagMapFotos
Punto de montaje: /share/TagMapFotos
```

---

## Usuarios virtuales

Por cada carpeta de equipo, TagMap crea automáticamente un usuario virtual:

| Carpeta | Email generado | Nombre | Rol |
|---------|----------------|--------|-----|
| `Equipo-Norte` | `equipo-norte@tagmap.internal` | Equipo-Norte | WORKER |
| `Equipo-Sur` | `equipo-sur@tagmap.internal` | Equipo-Sur | WORKER |
| `Inspección A` | `inspeccion-a@tagmap.internal` | Inspección A | WORKER |

Estos usuarios **no pueden hacer login** (contraseña = `N/A`). Solo existen para agrupar fotos en la base de datos.

---

## Monitorización

Los logs del backend mostrarán el progreso en cada escaneo:

```
🔍 Escaneando carpetas en /share/TagMapFotos...

📁 Procesando: Equipo-Norte
   👤 Usuario virtual creado: Equipo-Norte
   ✅ foto1.jpg
   ✅ foto2.jpg
   Importadas: 2 | Errores: 0

📁 Procesando: Equipo-Sur
   Sin fotos nuevas

📊 Total: 2 importadas, 0 errores
```

Ver los logs:
```bash
docker compose logs -f backend
```

---

## Flujo completo con OneDrive + Power Automate

### Paso 1 — Workers suben fotos a OneDrive

Cada worker tiene OneDrive con sincronización de cámara habilitada. Las fotos van a:
```
OneDrive/Imágenes de cámara/
```

### Paso 2 — Power Automate copia al NAS

Crea un flujo por cada worker:

1. **Trigger**: nueva foto en `OneDrive/Imágenes de cámara/`
2. **Action**: copiar archivo a carpeta del NAS vía **OneDrive for Business** o **SFTP**
   - Destino: `/share/TagMapFotos/Equipo-Norte/`
3. **Action**: mover original en OneDrive a carpeta "Procesadas"

### Paso 3 — TagMap importa automáticamente

El folder watcher detecta las fotos nuevas en `/share/TagMapFotos/Equipo-Norte/`, las procesa y las mueve a `procesadas/`.

---

## Detección de duplicados

TagMap calcula el hash MD5 de cada foto antes de importarla. Si encuentra el mismo hash, omite la foto:

```
   ⏭️  foto1.jpg (duplicado por hash)
```

Esto evita que se importen varias veces si:
- El mismo archivo se copia a múltiples carpetas
- Hay un error y se vuelven a copiar fotos ya procesadas

El hash se guarda en el campo `notes` de la foto:
```
Auto-importado desde Equipo-Norte | Hash: a3f4b2c1... | Original: IMG_1234.jpg
```

---

## Compatibilidad con modo usuario normal

**Sí, ambos modos conviven.**

- Los workers pueden seguir subiendo fotos desde la app web (`/worker/upload`)
- El folder watcher importa las que están en carpetas del NAS
- Ambas fuentes aparecen juntas en el panel admin

---

## Troubleshooting

### El watcher no arranca

Verifica en los logs:
```
📂 Folder watcher deshabilitado (ENABLE_FOLDER_WATCHER != true)
```

Solución: `ENABLE_FOLDER_WATCHER=true` en el `.env`

### No encuentra el directorio

```
⚠️  Directorio de observación no existe: /share/TagMapFotos
```

Solución:
- Crear la carpeta en el host
- Verificar que el bind mount está correcto en docker-compose.yml
- Asegurarte de que el usuario del contenedor tiene permisos de lectura

### Las fotos no se importan

Revisa:
- ¿Los archivos tienen extensión `.jpg`, `.jpeg` o `.png`?
- ¿Están en la raíz de la carpeta del equipo (no en subcarpetas)?
- ¿Los archivos no están ocultos (nombre empieza por `.`)?
- ¿El contenedor tiene permisos de escritura para crear `procesadas/`?

### Duplicados no se detectan

El hash se calcula del archivo completo. Si la foto se editó/comprimió después de subirla, el hash cambiará.

---

## Desactivar el watcher

Cambia en `.env`:
```env
ENABLE_FOLDER_WATCHER=false
```

Y reinicia el backend:
```bash
docker compose restart backend
```

Los usuarios virtuales creados permanecerán en la base de datos pero sin nuevas fotos.

---

## Migrar de modo carpetas a modo usuarios

Si quieres volver al modo tradicional (login web):

1. Desactiva el watcher: `ENABLE_FOLDER_WATCHER=false`
2. Crea usuarios reales en el panel admin
3. Reasigna fotos antiguas al nuevo usuario:
   ```sql
   UPDATE "Photo" 
   SET "userId" = <nuevo_user_id> 
   WHERE "userId" = <old_virtual_user_id>;
   ```
4. Borra los usuarios virtuales si quieres
