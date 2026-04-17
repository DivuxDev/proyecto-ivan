# CLAUDE.md — frontend

Next.js 14 App Router + TypeScript + Tailwind CSS para LineasCampo.

---

## Stack

| Capa           | Librería                        |
|----------------|---------------------------------|
| Framework      | Next.js 14 (App Router)         |
| Lenguaje       | TypeScript 5 (strict)           |
| Estilos        | Tailwind CSS 3 + custom config  |
| Estado global  | Zustand (auth) + TanStack Query v5 (servidor) |
| Formularios    | React Hook Form + Zod           |
| HTTP           | Axios (instancia en `lib/api.ts`) |
| Mapas          | Leaflet 1.9 (import dinámico, sin SSR) |
| Gráficas       | Recharts 2                      |
| Fechas         | date-fns 3 (locale `es`)        |
| Iconos         | lucide-react                    |

---

## Arranque local (sin Docker)

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
npm install
npm run dev                  # Next.js en :3000
```

---

## Estructura de `src/`

```
src/
├── app/
│   ├── layout.tsx            # Root layout (Providers, fuentes)
│   ├── page.tsx              # Redirect según rol (/ → /worker o /dashboard)
│   ├── globals.css           # @tailwind base/components/utilities + vars CSS
│   ├── providers.tsx         # QueryClientProvider + Toaster
│   ├── (auth)/               # Grupo sin layout con nav (login, register)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (worker)/             # Layout móvil con WorkerNav bottom bar
│   │   ├── layout.tsx        # Auth guard → solo WORKER
│   │   └── worker/
│   │       ├── page.tsx      # Home: resumen + botón cámara rápida
│   │       ├── upload/page.tsx   # Subir foto (GPS + cámara)
│   │       └── history/page.tsx  # Historial propio
│   └── (admin)/              # Layout con AdminSidebar
│       ├── layout.tsx        # Auth guard → solo ADMIN
│       └── dashboard/
│           ├── page.tsx           # KPIs + gráficas + tabla workers
│           ├── users/page.tsx     # CRUD trabajadores
│           ├── photos/page.tsx    # Galería paginada + filtros
│           └── map/page.tsx       # Mapa Leaflet con todas las fotos GPS
├── components/
│   ├── layout/
│   │   ├── AdminSidebar.tsx  # Sidebar fija lg, hamburger en móvil
│   │   └── WorkerNav.tsx     # Bottom bar fija con botón cámara central
│   ├── charts/
│   │   ├── ActivityChart.tsx # AreaChart (fotos + workers por día)
│   │   └── WorkerChart.tsx   # BarChart horizontal (fotos por trabajador)
│   └── map/
│       └── PhotoMap.tsx      # Leaflet puro vía require() (no SSR)
├── hooks/
│   ├── useAuth.ts            # Lógica login/logout sobre authStore
│   └── useGeolocation.ts     # navigator.geolocation wrapper con estado
├── lib/
│   ├── api.ts                # Axios instance + interceptores + api helpers
│   └── utils.ts              # cn(), formatDate(), formatCoords(), downloadBlob()
├── store/
│   └── authStore.ts          # Zustand persist: user, token, setAuth, logout
├── types/
│   └── index.ts              # Todas las interfaces: User, Photo, MapPhoto, etc.
└── middleware.ts             # Next.js: redirige / según rol en token JWT
```

---

## Grupos de rutas (route groups)

| Grupo       | Guard                          | Layout              |
|-------------|-------------------------------|---------------------|
| `(auth)`    | Ninguno                        | Centrado, fondo oscuro |
| `(worker)`  | `role === WORKER` + `isAuthenticated` | Fondo blanco, WorkerNav abajo |
| `(admin)`   | `role === ADMIN` + `isAuthenticated`  | Fondo navy, AdminSidebar izq. |

La redirección se hace con `useEffect` + `router.replace()` en cada `layout.tsx`.

---

## Auth flow

1. `authStore` (Zustand) persiste `{ user, token }` en `localStorage` bajo la clave `lineas-auth`.
2. `api.ts` interceptor adjunta `Authorization: Bearer <token>` en cada request.
3. En 401, el interceptor limpia el store y redirige a `/login`.
4. `middleware.ts` (Edge) decodifica el JWT sin verificar firma (sólo para redirigir; el backend valida).

---

## Reglas de Tailwind

Las clases custom están definidas en `tailwind.config.ts`:

```
admin-card        bg-navy-800 border border-navy-600 rounded-2xl p-6
input-dark        bg-navy-900 border border-navy-600 rounded-xl px-4 py-2.5 text-white
shadow-card-dark  sombra oscura para cards navy
shadow-amber-glow resplandor amber para botón CTA y marcadores del mapa
animate-slide-up  entrada de modals/panels
```

Colores disponibles: `navy-50` … `navy-900`, `brand-50` … `brand-900` (amber).

---

## Leaflet en Next.js

**Siempre importar PhotoMap con importación dinámica:**

```tsx
const PhotoMap = dynamic(() => import('@/components/map/PhotoMap'), { ssr: false });
```

El componente usa `require('leaflet')` internamente para evitar errores de SSR.  
El CSS de Leaflet también se carga vía `require('leaflet/dist/leaflet.css')` dentro del `useEffect`.

---

## Variables de entorno

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

---

## Comandos

```bash
npm run dev     # desarrollo con HMR en :3000
npm run build   # compilar para producción (detecta errores TS)
npm run lint    # ESLint
npm start       # iniciar build de producción
```

---

## Convenciones

- Todos los componentes de página son `'use client'` (usan hooks de Query / form / router).
- Los tipos globales están centralizados en `src/types/index.ts`; no crear interfaces inline en componentes.
- Los calls a la API se hacen **siempre** a través de los helpers de `src/lib/api.ts` (`authApi`, `photosApi`, `usersApi`, `statsApi`). No usar `api.get(...)` directamente en componentes.
- Paginación: el backend devuelve `{ data: [], pagination: { page, limit, total, totalPages } }`.
