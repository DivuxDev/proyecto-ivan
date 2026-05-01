# CLAUDE.md — proyecto ivan (TagMap)

**TagMap** es una plataforma de geotagging visual para trabajos de campo. Permite a equipos subir fotos con GPS automático, visualizarlas en un mapa interactivo, gestionar usuarios y exportar reportes.

Monorepo con dos proyectos independientes: `backend/` (API REST) y `frontend/` (Next.js).

---

## Estructura del monorepo

```
proyecto ivan/
├── backend/          # API Express + TypeScript + Prisma + PostgreSQL
├── frontend/         # Next.js 14 App Router + TypeScript + Tailwind CSS
├── docker-compose.yml
└── README.md
```

---

## Levantar el entorno completo

```bash
# 1ª vez: construir imágenes y levantar todo
docker compose up -d --build

# Después del primer levantado, ejecutar migraciones y seed
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed

# Ver logs en tiempo real
docker compose logs -f

# Parar
docker compose down
```

### Servicios Docker

| Servicio   | Puerto local | Descripción                  |
|------------|-------------|------------------------------|
| `db`       | 5432        | PostgreSQL 15                |
| `backend`  | 4000        | API REST                     |
| `frontend` | 3000        | Next.js (SSR)                |

### Credenciales semilla

- Admin: `admin@tagmap.app` / `Admin1234!`
- Worker demo: `worker@tagmap.app` / `Worker1234!`

---

## Variables de entorno

Copiar `.env.example` a `.env` en cada proyecto antes de levantar localmente sin Docker.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

---

## Roles y acceso

| Rol      | Rutas frontend    | Descripción                     |
|----------|-------------------|---------------------------------|
| `ADMIN`  | `/dashboard/*`    | Dashboard, usuarios, fotos, mapa |
| `WORKER` | `/worker/*`       | Subir fotos, historial personal  |

La protección de rutas es client-side en los layouts `(admin)/layout.tsx` y `(worker)/layout.tsx`.  
El middleware Next.js (`src/middleware.ts`) redirige `/` al destino correcto según rol.

---

## Decisiones técnicas clave

- **JWT** almacenado en `localStorage` (compatible con PWA móvil). Expira en 24h.
- **Imágenes**: Se optimizan con Sharp (máx. 1920px, JPEG q85, rotación EXIF automática). El archivo original se borra; se guarda `*_opt.jpg`.
- **GPS**: EXIF tiene prioridad sobre coord. enviadas por el cliente. Fallback: coords del body → null.
- **Leaflet** requiere importación dinámica con `ssr: false` en cualquier página Next.js.
- **Soft delete** en usuarios: campo `active: false`, nunca `DELETE` de DB.
- **Rate limiting**: 20 req/15min en `/auth/login`; 300 req/15min en el resto.
- **Folder Watcher** (rama `folder-concept`): Importación automática desde carpetas del NAS organizadas por equipo. Ver [FOLDER-WATCHER.md](FOLDER-WATCHER.md).

---

## Modos de operación

TagMap soporta **dos modos** que pueden coexistir:

### Modo 1: Usuario tradicional (por defecto)
- Workers hacen login en `/worker/upload`
- Suben fotos desde la interfaz web (cámara o galería)
- Cada foto se asocia al usuario que la subió
- Ideal para: equipos pequeños, control individual

### Modo 2: Folder Watcher (rama `folder-concept`)
- Carpetas en el NAS organizadas por equipo (`/share/TagMapFotos/Equipo-Norte/`)
- El backend escanea periódicamente y auto-importa fotos nuevas
- Crea usuarios virtuales por carpeta (`equipo-norte@tagmap.internal`)
- Las fotos procesadas se mueven a `carpeta/procesadas/`
- Ideal para: muchos trabajadores, integración con OneDrive/Power Automate, NAS compartido

**Ambos modos pueden usarse simultáneamente** — algunos workers suben desde la web, otros desde carpetas del NAS.

---

## Convenciones de código

- Todo el código en **TypeScript estricto** (sin `any` explícito).
- Backend: `express-async-errors` — todos los controllers son `async`, los errores se manejan con `AppError`.
- Frontend: TanStack Query para estado servidor, Zustand para auth, React Hook Form + Zod para formularios.
- Clases Tailwind: usar las utilidades custom definidas en `tailwind.config.ts` (`navy-*`, `brand-*`, `admin-card`, `input-dark`, etc.).

---

## Comandos útiles

```bash
# Backend (dentro de backend/)
npm run dev           # servidor con hot-reload
npm run db:studio     # UI visual de Prisma
npm run db:migrate:dev -- --name <nombre>  # nueva migración
npm run db:seed       # repoblar DB

# Frontend (dentro de frontend/)
npm run dev           # Next.js en modo desarrollo
npm run build         # compilar para producción
npm run lint          # ESLint

# Docker (desde raíz del proyecto)
docker compose up -d --build              # levantar todo
docker compose logs -f                    # ver logs
docker compose down                       # parar servicios
docker compose down -v                    # parar y borrar volúmenes (¡borra DB!)
docker compose exec backend npm run db:seed   # seed desde container
```

---

## Scripts de automatización (para Container Station en QNAP)

TagMap incluye scripts bash para gestión completa del deployment en QNAP NAS.

### tagmap-manager.sh — Script de gestión todo-en-uno (RECOMENDADO) 🌟

Script interactivo con menú que gestiona todo el ciclo de vida de TagMap en QNAP.

```bash
# Conectar via SSH al NAS
ssh DavidPrado@192.168.1.201

# Navegar al proyecto
cd /share/homes/DavidPrado/tagmap

# Ejecutar gestor
sudo ./tagmap-manager.sh
```

**Menú de opciones:**

1. **🚀 Instalación inicial completa**
   - Verifica Docker y requisitos
   - Crea carpetas con permisos correctos
   - Valida configuración `.env`
   - Construye imágenes, levanta contenedores
   - Ejecuta migraciones y seed
   - Muestra credenciales de acceso

2. **🔄 Actualizar desde GitHub**
   - Usa contenedor Docker (sin necesidad de Git instalado)
   - Backup automático del `.env`
   - Muestra commits nuevos antes de actualizar
   - Reconstruye contenedores
   - Ejecuta migraciones automáticamente

3. **🗄️ Resetear y remigrar base de datos**
   - Backup automático de BD actual
   - Elimina volumen PostgreSQL
   - Recrea BD limpia desde cero
   - Ejecuta migraciones y seed
   - **Sincroniza todas las fotos desde el NAS automáticamente**
   - Activa Folder Watcher si estaba deshabilitado

4. **📊 Ver estado y logs**
   - Estado de contenedores
   - Fotos por equipo (pendientes/procesadas)
   - Configuración actual
   - Logs en tiempo real

**Ventajas:**
- Todo automatizado en un solo script
- Backups automáticos antes de cambios
- Confirmación antes de acciones destructivas
- Sincronización completa de fotos del NAS
- No requiere Git instalado en el NAS
- Interface colorida y clara

**Documentación completa:** [TAGMAP-MANAGER.md](TAGMAP-MANAGER.md)

---

### Scripts individuales (alternativos)

Si prefieres ejecutar operaciones específicas:

#### install.sh — Primera instalación
```bash
bash install.sh
```

**Acciones que realiza:**
- ✅ Verifica Docker y Docker Compose
- ✅ Crea `.env` desde `.env.example` con validación interactiva
- ✅ Construye las imágenes Docker
- ✅ Levanta los contenedores
- ✅ Espera 30s a que PostgreSQL esté listo
- ✅ Ejecuta migraciones de base de datos
- ✅ Crea usuario admin inicial (admin@tagmap.app / Admin1234!)
- ✅ Muestra URLs de acceso y credenciales

#### update-qnap.sh — Actualización desde GitHub (sin Git)
```bash
bash update-qnap.sh
```

**Acciones que realiza:**
- ✅ Detecta rama actual usando contenedor Git
- ✅ Muestra commits nuevos disponibles
- ✅ Hace backup automático de `.env`
- ✅ Descarga actualizaciones desde GitHub
- ✅ Reconstruye contenedores
- ✅ Ejecuta migraciones (si hay cambios en BD)
- ✅ Restaura el `.env` tras actualizar

#### sync.sh — Sincronización de emergencia (disaster recovery)
```bash
bash sync.sh
```

**Acciones que realiza:**
- ✅ Escanea todas las carpetas en `/share/Container/imagenes-tagmap`
- ✅ Detecta fotos por importar
- ✅ Muestra resumen (fotos encontradas por equipo)
- ✅ El Folder Watcher las importará automáticamente
- ✅ Detección de duplicados por hash MD5 (evita reimportar fotos ya en DB)

**Cuándo usar sync.sh:**
- Tras reinstalación completa de TagMap
- Cuando la base de datos se ha borrado/corrompido
- Para verificar consistencia entre NAS y DB

### Monitorización del Folder Watcher (frontend)

El dashboard admin incluye un panel **Folder Watcher Status** que muestra en tiempo real:
- ✅ Estado (habilitado/deshabilitado)
- ✅ Última fecha de sincronización
- ✅ Resultado del último scan (fotos importadas, errores)
- ✅ Tiempo hasta el próximo escaneo
- ✅ Carpeta monitoreada
- ✅ Botón de actualización manual

**Endpoint API:** `GET /api/folder-watcher/status` (requiere rol ADMIN)

---

## Deployment en producción

### Fresh start (limpiar base de datos y fotos)

Útil cuando cambias el nombre de la app o quieres empezar de cero:

```bash
# 1. Parar servicios
docker compose down

# 2. Listar y borrar volúmenes (ajusta prefijo según tu sistema)
docker volume ls | grep tagmap
docker volume rm <proyecto>_postgres_data <proyecto>_uploads_data

# 3. Actualizar variables de entorno en Coolify/VPS
POSTGRES_USER=tagmap_user
POSTGRES_PASSWORD=<nueva_password>
POSTGRES_DB=tagmap_db
DATABASE_URL=postgresql://tagmap_user:<password>@db:5432/tagmap_db

# 4. Redeploy
docker compose up -d --build

# 5. Inicializar DB
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed
```

### Migrar DB existente (conservar datos)

Si quieres mantener fotos y usuarios tras un cambio de nombre:

```bash
# 1. Conectar a PostgreSQL
docker compose exec db psql -U <old_user> -d postgres

# 2. Renombrar DB y usuario
ALTER DATABASE lineas_db RENAME TO tagmap_db;
ALTER USER lineas_user RENAME TO tagmap_user;
ALTER USER tagmap_user WITH PASSWORD '<nueva_password>';
\q

# 3. Actualizar variables de entorno y redeploy
```

### Backup automático

```bash
# Exportar DB
docker compose exec db pg_dump -U tagmap_user tagmap_db > backup_$(date +%Y%m%d).sql

# Copiar fotos
docker cp $(docker compose ps -q backend):/app/uploads ./backup_uploads

# Restaurar DB
docker compose exec -T db psql -U tagmap_user tagmap_db < backup.sql
```

---

## Folder Watcher — Importación automática (rama `folder-concept`)

El Folder Watcher permite importar fotos automáticamente desde carpetas organizadas por equipo en el NAS.

### Variables de entorno necesarias

```env
# Habilitar el watcher
ENABLE_FOLDER_WATCHER=true

# Ruta donde están las carpetas de equipos
WATCH_FOLDERS_DIR=/share/TagMapFotos

# Intervalo de escaneo en segundos (por defecto 60)
SCAN_INTERVAL_SECONDS=60
```

### Estructura de carpetas requerida

```
/share/TagMapFotos/
  ├── Equipo-Norte/
  │   ├── foto1.jpg        ← detectada y procesada
  │   ├── foto2.jpg        ← detectada y procesada
  │   └── procesadas/      ← creada automáticamente
  │       ├── foto1.jpg    ← movida tras importar
  │       └── foto2.jpg    ← movida tras importar
  ├── Equipo-Sur/
  │   └── IMG_001.jpg
  └── Equipo-Centro/
      └── DCIM_1234.jpg
```

### Configuración en Docker

Añadir en `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      ENABLE_FOLDER_WATCHER: true
      WATCH_FOLDERS_DIR: /share/TagMapFotos
      SCAN_INTERVAL_SECONDS: 60
    volumes:
      - uploads_data:/app/uploads
      # Bind mount para carpetas de equipos
      - /ruta/real/TagMapFotos:/share/TagMapFotos
```

### Funcionamiento

1. El backend escanea periódicamente `WATCH_FOLDERS_DIR`
2. Por cada carpeta, crea un usuario virtual: `equipo-norte@tagmap.internal`
3. Detecta fotos nuevas (`.jpg`, `.jpeg`, `.png`)
4. Extrae GPS del EXIF, optimiza con Sharp
5. Guarda en DB asociada al usuario virtual
6. Mueve el original a `carpeta/procesadas/`
7. Detecta duplicados por hash MD5

### Monitorización

Ver logs del backend:

```bash
docker compose logs -f backend
```

Salida ejemplo:

```
🔍 Escaneando carpetas en /share/TagMapFotos...

📁 Procesando: Equipo-Norte
   👤 Usuario virtual creado: Equipo-Norte
   ✅ foto1.jpg
   ✅ foto2.jpg
   Importadas: 2 | Errores: 0

📊 Total: 2 importadas, 0 errores
```

**Documentación completa:** [FOLDER-WATCHER.md](FOLDER-WATCHER.md)

---

## Pruebas locales antes de producción

**Guía de pruebas:** [TESTING.md](TESTING.md)

Documentación completa para probar TagMap localmente antes de desplegar en producción, incluyendo:
- Configuración local con Docker Desktop
- Prueba de subida manual (modo tradicional)
- Prueba de Folder Watcher (modo automático)
- Prueba de detección de duplicados
- Prueba de fotos sin GPS
- Prueba de exportación CSV
- Troubleshooting de entorno local
- Checklist de validación completo

---

## Despliegue en QNAP NAS

**Guía completa:** [DEPLOY-QNAP.md](DEPLOY-QNAP.md)

Documentación paso a paso para desplegar TagMap en un NAS QNAP con Container Station, incluyendo:
- Configuración de carpetas compartidas
- Instalación con Docker Compose
- Activación del Folder Watcher
- Acceso externo con Cloudflare Tunnel
- Backup automático
- Troubleshooting común
- Checklist de producción

---

## Integración OneDrive + Power Automate

**Guía completa:** [ONEDRIVE-POWER-AUTOMATE.md](ONEDRIVE-POWER-AUTOMATE.md)

Documentación paso a paso para configurar subida automática desde OneDrive de trabajadores usando Power Automate + Qsync + Folder Watcher, incluyendo:
- Configuración de carpetas compartidas en OneDrive
- Creación de flujos automáticos por trabajador
- Instalación y configuración de Qsync en el NAS
- Sincronización automática OneDrive → NAS
- Flujo completo: Móvil → OneDrive → NAS → TagMap
- Troubleshooting y mantenimiento
- Alternativas (FTP, SharePoint, Dropbox)

**Nota:** El Folder Watcher es compatible con Power Automate — puedes configurar Power Automate para que copie fotos de OneDrive a las carpetas del NAS, y el Folder Watcher las importará automáticamente.
