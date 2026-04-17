# CLAUDE.md — backend

API REST en Express + TypeScript + Prisma para LineasCampo.

---

## Stack

| Capa         | Librería                        |
|--------------|---------------------------------|
| Framework    | Express 4 + express-async-errors |
| Lenguaje     | TypeScript 5 (strict)           |
| ORM          | Prisma 5 + PostgreSQL 15        |
| Auth         | jsonwebtoken + bcryptjs         |
| Imágenes     | Multer (disk) + Sharp           |
| EXIF         | exifr                           |
| Exportación  | xlsx                            |
| Seguridad    | helmet, cors, express-rate-limit |
| Logs         | morgan                          |

---

## Arranque local (sin Docker)

```bash
cp .env.example .env    # completar DATABASE_URL y JWT_SECRET
npm install
npm run db:generate     # genera el cliente Prisma
npm run db:migrate:dev  # crea la DB y aplica migraciones
npm run db:seed         # usuario admin + worker de ejemplo
npm run dev             # nodemon con tsx, puerto 4000
```

---

## Estructura de `src/`

```
src/
├── app.ts                  # Express app (middlewares, rutas, error handler)
├── server.ts               # Punto de entrada, conecta Prisma y escucha
├── config/
│   ├── database.ts         # Singleton PrismaClient
│   ├── jwt.ts              # signToken / verifyToken
│   └── storage.ts          # UPLOAD_DIR, getFileUrl()
├── types/
│   └── index.ts            # Interfaces globales, extensión de Request
├── middleware/
│   ├── auth.middleware.ts  # authenticate (JWT), requireRole (ADMIN|WORKER)
│   ├── upload.middleware.ts # Multer + validación mimetype
│   └── error.middleware.ts # Handler global, formatea AppError
├── utils/
│   ├── exif.utils.ts       # extractExifData() → GPS + takenAt
│   ├── password.utils.ts   # hash / compare bcrypt
│   └── export.utils.ts     # generateCsv / generateXlsx
├── controllers/
│   ├── auth.controller.ts  # login, register, me, refresh
│   ├── users.controller.ts # CRUD de usuarios (admin)
│   ├── photos.controller.ts# upload, list, get, delete, getMapPhotos
│   └── stats.controller.ts # overview, activity, workerStats, export
└── routes/
    ├── auth.routes.ts
    ├── users.routes.ts
    ├── photos.routes.ts
    ├── stats.routes.ts
    └── index.ts            # monta todos los routers en /api/v1
```

---

## Endpoints principales

```
POST   /api/v1/auth/login
POST   /api/v1/auth/register      [ADMIN]
GET    /api/v1/auth/me

GET    /api/v1/users               [ADMIN]
POST   /api/v1/users               [ADMIN]
PUT    /api/v1/users/:id           [ADMIN]
DELETE /api/v1/users/:id           [ADMIN]

POST   /api/v1/photos              multipart/form-data
GET    /api/v1/photos              ?userId &startDate &endDate &page &limit
GET    /api/v1/photos/map          ?userId (máx 1000 coords)
DELETE /api/v1/photos/:id          [ADMIN]

GET    /api/v1/stats/overview
GET    /api/v1/stats/activity      ?period=7d|30d|90d
GET    /api/v1/stats/workers
GET    /api/v1/stats/export        ?format=csv|xlsx
```

---

## Manejo de errores

Todos los errores deben lanzarse como `new AppError(mensaje, statusCode)`.  
`express-async-errors` captura los `throw` en handlers async automáticamente.  
El handler global en `error.middleware.ts` formatea la respuesta como `{ success: false, message, ... }`.

---

## Flujo de subida de fotos

1. `upload.middleware.ts` valida mimetype (jpeg/png/webp/heic) y límite 25 MB.
2. Multer guarda el archivo original en `UPLOAD_DIR`.
3. `photos.controller.ts → uploadPhoto()`:
   - Extrae EXIF con `extractExifData()` (GPS + takenAt).
   - Combina coords EXIF (prioridad) con coords del body (fallback).
   - Sharp: resize 1920px, JPEG q85, rotación auto → guarda `*_opt.jpg`.
   - Borra el archivo original.
   - Crea registro en DB.

---

## Variables de entorno

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/lineas
JWT_SECRET=<mínimo 32 chars aleatorios>
JWT_EXPIRES_IN=24h
UPLOAD_DIR=./uploads
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

---

## Migraciones y seed

```bash
npm run db:migrate:dev -- --name descripcion   # nueva migración (dev)
npm run db:migrate                             # aplicar en producción
npm run db:seed                                # admin@lineas.com / Admin1234!
npm run db:studio                              # Prisma Studio en :5555
npm run db:reset                               # nuclear: borra todo + re-seed (⚠️)
```
