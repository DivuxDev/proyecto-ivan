# TagMap — Gestión de Trabajos de Campo

Plataforma web de geotagging visual para el control de actividad diaria de trabajadores en campo. Sube fotos con GPS, visualiza ubicaciones en mapa interactivo, exporta reportes y gestiona equipos de trabajo.

<img width="1416" height="904" alt="image" src="https://github.com/user-attachments/assets/5b8b3f52-a724-49aa-b56d-e2366bd954aa" />

<img width="1419" height="907" alt="image" src="https://github.com/user-attachments/assets/dac31b64-f7c8-4e64-8a60-cf77b12a1ec4" />

<img width="1401" height="910" alt="image" src="https://github.com/user-attachments/assets/6159753e-56b3-4d6f-87c0-5ee77b941173" />




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

## Despliegue con Docker

### Desarrollo local

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/proyecto-ivan.git
cd proyecto-ivan

# 2. Copiar y configurar variables de entorno
cp .env.example .env
# Edita .env con tus valores (opcional en desarrollo)

# 3. Levantar todos los servicios
docker compose up -d --build

# 4. Esperar a que los contenedores estén listos (healthcheck)
docker compose ps

# 5. Ejecutar migraciones y seed de datos
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed

# 6. Ver logs en tiempo real
docker compose logs -f
```

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Health check: http://localhost:4000/health

### Producción (VPS / Coolify / Portainer)

#### 1. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de datos
POSTGRES_USER=tagmap_user
POSTGRES_PASSWORD=GENERA_PASSWORD_SEGURA_AQUI
POSTGRES_DB=tagmap_db

# JWT (genera con: openssl rand -hex 32)
JWT_SECRET=GENERA_SECRET_ALEATORIO_MIN_32_CHARS
JWT_EXPIRES_IN=24h

# CORS - URL pública de tu frontend
CORS_ORIGIN=https://tudominio.com

# Opcional: ruta personalizada para uploads (QNAP/NAS)
# UPLOADS_PATH=/share/TagMapUploads
```

#### 2. Levantar en producción

```bash
docker compose up -d --build
```

#### 3. Inicializar base de datos

```bash
# Aplicar schema
docker compose exec backend npm run db:migrate

# Crear usuario admin inicial
docker compose exec backend npm run db:seed
```

> **Credenciales iniciales**: `admin@tagmap.app` / `admin123` (cámbialas tras el primer login)

#### 4. Acceder desde internet

**Opción A — Proxy reverso (Nginx/Traefik)**

Apunta tu dominio al puerto `3000` del servidor.

**Opción B — Cloudflare Tunnel** (sin abrir puertos)

```bash
docker run -d --name cloudflared \
  --restart unless-stopped \
  --network host \
  cloudflare/cloudflared:latest \
  tunnel --no-autoupdate run --token TU_TOKEN_CLOUDFLARE
```

Configura el túnel en [dash.cloudflare.com](https://dash.cloudflare.com) apuntando a `http://localhost:3000`.

### Comandos útiles

```bash
# Ver logs de todos los servicios
docker compose logs -f

# Ver logs solo del backend
docker compose logs -f backend

# Parar la aplicación
docker compose down

# Parar y BORRAR volúmenes (¡borra DB y fotos!)
docker compose down -v

# Reiniciar solo un servicio
docker compose restart backend

# Entrar al contenedor del backend
docker compose exec backend sh

# Ver estado de los contenedores
docker compose ps

# Reconstruir tras cambios en código
docker compose up -d --build
```

### Fresh start (borrar todo y empezar de cero)

Si quieres limpiar completamente la aplicación (útil tras cambios de nombre o en desarrollo):

```bash
# 1. Parar servicios
docker compose down

# 2. Listar volúmenes del proyecto
docker volume ls | grep tagmap

# 3. Borrar volúmenes (ajusta el prefijo según tu sistema)
docker volume rm proyecto-ivan_postgres_data proyecto-ivan_uploads_data

# 4. Levantar de nuevo
docker compose up -d --build

# 5. Inicializar DB
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed
```

### Actualizar a nueva versión

```bash
# 1. Obtener últimos cambios
git pull origin main

# 2. Reconstruir y reiniciar
docker compose up -d --build

# 3. Si hay cambios en el schema de DB
docker compose exec backend npm run db:migrate
```

### Backup de datos

```bash
# Exportar base de datos
docker compose exec db pg_dump -U tagmap_user tagmap_db > backup_$(date +%Y%m%d).sql

# Importar backup
docker compose exec -T db psql -U tagmap_user tagmap_db < backup_20260421.sql

# Copiar carpeta de fotos (desde el contenedor)
docker cp $(docker compose ps -q backend):/app/uploads ./backup_uploads_$(date +%Y%m%d)
```

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

## Características principales

✅ **Geotagging automático** — Extrae GPS del EXIF de fotos tomadas con móvil  
✅ **Mapa interactivo** — Visualiza todas las ubicaciones en Leaflet  
✅ **Multi-usuario** — Roles ADMIN y WORKER con permisos diferenciados  
✅ **Subida masiva** — Selecciona múltiples fotos desde la galería  
✅ **Optimización automática** — Redimensión y compresión con Sharp  
✅ **Dashboard analítico** — Gráficas de actividad y estadísticas  
✅ **Exportación de datos** — Descarga reportes en Excel  
✅ **Responsive** — Diseñado para móvil (PWA-ready)  
✅ **Docker** — Despliegue en un comando  

## Roadmap futuro

- [ ] Almacenamiento en nube (S3 / Cloudflare R2 / Azure Blob)
- [ ] PWA offline-first con Service Worker + queue de subidas
- [ ] Notificaciones push (recordatorios, alertas admin)
- [ ] Integración con OneDrive + Power Automate (auto-upload)
- [ ] Firma digital / QR de validación de trabajos
- [ ] App nativa (React Native o Capacitor)
- [ ] Multi-tenant (varias empresas en la misma instancia)
- [ ] Reconocimiento de objetos en fotos (IA)
- [ ] Geofencing (alertas al entrar/salir de zonas)
- [ ] API keys de larga duración (alternativa a JWT para integraciones)
