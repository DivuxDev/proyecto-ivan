# Etapa 1: Instalar dependencias de producción
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Etapa 2: Build de TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# Etapa 3: Imagen de producción
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl openssl

# Copiar sólo lo necesario
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Directorio de uploads
RUN mkdir -p uploads

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Ejecutar migraciones y arrancar servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
