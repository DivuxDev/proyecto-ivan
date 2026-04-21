# TagMap — Gestión de Trabajos de Campo

Plataforma web para el control de actividad diaria de trabajadores en campo (instalación y mantenimiento de líneas eléctricas).

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Auth | JWT (bcrypt para contraseñas) |
| Almacenamiento | Local (Multer) — fácilmente extensible a AWS S3 |
| Mapas | Leaflet.js (react-leaflet) |
| Gráficas | Recharts |
| Estado cliente | Zustand + TanStack Query |

## Estructura del proyecto

```
proyecto-ivan/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Esquema de BD
│   │   └── seed.ts             # Datos de prueba
│   ├── src/
│   │   ├── config/             # DB, JWT, Storage
│   │   ├── controllers/        # Lógica de negocio
│   │   ├── middleware/         # Auth, Upload, Errors
│   │   ├── routes/             # Definición de rutas
│   │   ├── utils/              # EXIF, Export, Password
│   │   ├── types/              # TypeScript interfaces
│   │   ├── app.ts              # Express app
│   │   └── server.ts           # Entry point
│   ├── uploads/                # Fotos subidas (local)
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/   # Login
│   │   │   ├── (auth)/register/# Registro
│   │   │   ├── (worker)/worker/# App trabajador
│   │   │   ├── (admin)/dashboard/ # Panel admin
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── layout/         # Sidebar, Nav
│   │   │   ├── ui/             # Button, Input, Card...
│   │   │   ├── photos/         # PhotoCard, PhotoUpload...
│   │   │   ├── map/            # LeafletMap
│   │   │   └── charts/         # ActivityChart, WorkerChart
│   │   ├── hooks/              # useAuth, useGeolocation
│   │   ├── lib/                # API client, utils
│   │   ├── store/              # Zustand store
│   │   └── types/              # TypeScript types
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── docker-compose.yml
└── README.md
```

## Arranque rápido (desarrollo)

### Requisitos
- Node.js 20+
- PostgreSQL 15+
- npm o pnpm

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edita .env con tu DATABASE_URL

npm install
npm run db:generate   # Genera Prisma client
npm run db:migrate    # Aplica migraciones
npm run db:seed       # Crea usuarios de prueba
npm run dev           # Arranca en http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env

npm install
npm run dev           # Arranca en http://localhost:3000
```

## Arranque con Docker

```bash
cp .env.example .env  # Edita variables si necesitas

docker-compose up --build
```

La app estará disponible en:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Health check: http://localhost:4000/health

## Usuarios de prueba (seed)

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@tagmap.app | admin123 | Admin |
| carlos@tagmap.app | worker123 | Trabajador |
| pedro@tagmap.app | worker123 | Trabajador |
| maria@tagmap.app | worker123 | Trabajador |

## API Endpoints

### Auth
- `POST /api/auth/login` — Login
- `POST /api/auth/register` — Registro
- `GET /api/auth/me` — Perfil actual

### Fotos
- `POST /api/photos` — Subir foto (multipart/form-data)
- `GET /api/photos` — Listar fotos (con filtros)
- `GET /api/photos/map` — Fotos con coords para mapa
- `GET /api/photos/:id` — Detalle de foto
- `DELETE /api/photos/:id` — Eliminar foto (admin)

### Usuarios (admin)
- `GET /api/users` — Listar usuarios
- `POST /api/users` — Crear usuario
- `PUT /api/users/:id` — Actualizar usuario
- `DELETE /api/users/:id` — Desactivar usuario
- `PUT /api/users/:id/password` — Cambiar contraseña

### Estadísticas (admin)
- `GET /api/stats/overview` — KPIs generales
- `GET /api/stats/activity?period=week` — Actividad diaria
- `GET /api/stats/workers` — Stats por trabajador
- `GET /api/stats/export?format=xlsx` — Exportar datos

## Variables de entorno

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/tagmap_db
JWT_SECRET=minimum_32_character_random_secret
JWT_EXPIRES_IN=24h
PORT=4000
NODE_ENV=development
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Roadmap futuro

- [ ] Almacenamiento en AWS S3 / Cloudflare R2
- [ ] PWA con soporte offline (Service Worker + queue)
- [ ] Notificaciones push (Web Push)
- [ ] Firma digital de partes de trabajo
- [ ] App nativa (React Native)
- [ ] Multi-empresa / multi-tenant
- [ ] Integración con sistemas de nómina
