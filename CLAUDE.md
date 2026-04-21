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

## Integración OneDrive + Power Automate

Ver archivo `DEPLOY-NAS-ONEDRIVE.md` para configurar subida automática desde OneDrive de trabajadores usando Power Automate + API del backend.
