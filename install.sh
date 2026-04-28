#!/bin/bash

# ============================================
# TagMap - Script de instalación inicial
# ============================================

set -e  # Salir si hay error

echo "╔════════════════════════════════════════╗"
echo "║   TagMap - Instalación inicial        ║"
echo "╔════════════════════════════════════════╗"
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml no encontrado"
    echo "   Ejecuta este script desde la carpeta raíz del proyecto"
    exit 1
fi

# Verificar Docker
echo "🔍 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado"
    echo "   Instala Docker primero: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose no está instalado"
    exit 1
fi

echo "✅ Docker y Docker Compose encontrados"
echo ""

# Verificar/crear archivo .env
if [ ! -f ".env" ]; then
    echo "⚙️  Creando archivo .env..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env creado desde .env.example"
    else
        echo "❌ .env.example no encontrado"
        exit 1
    fi
    
    echo ""
    echo "⚠️  IMPORTANTE: Edita el archivo .env con tus configuraciones:"
    echo "   - POSTGRES_PASSWORD"
    echo "   - JWT_SECRET (genera uno con: openssl rand -hex 32)"
    echo "   - CORS_ORIGIN"
    echo ""
    read -p "¿Has editado el .env? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "❌ Instalación cancelada. Edita .env y vuelve a ejecutar este script."
        exit 1
    fi
else
    echo "✅ .env ya existe"
fi

echo ""
echo "🔨 Construyendo imágenes Docker..."
docker compose build

echo ""
echo "▶️  Levantando contenedores..."
docker compose up -d

echo ""
echo "⏳ Esperando a que PostgreSQL esté listo (30s)..."
sleep 30

echo ""
echo "🗃️  Ejecutando migraciones de base de datos..."
docker compose exec -T backend npm run db:migrate

echo ""
echo "🌱 Creando datos iniciales (seed)..."
docker compose exec -T backend npm run db:seed

echo ""
echo "✅ Estado de contenedores:"
docker compose ps

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   ✅ Instalación completada           ║"
echo "╔════════════════════════════════════════╗"
echo ""
echo "🌐 Acceso a la aplicación:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:4000"
echo ""
echo "👤 Usuario admin por defecto:"
echo "   Email:    admin@tagmap.app"
echo "   Password: admin123"
echo ""
echo "📊 Ver logs en tiempo real:"
echo "   docker compose logs -f"
echo ""
echo "⚠️  IMPORTANTE: Cambia la contraseña del admin después del primer login"
echo ""
