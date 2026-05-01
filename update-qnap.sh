#!/bin/bash

# ===========================================
# TagMap - Script de actualización para QNAP
# ===========================================
# Actualiza TagMap desde GitHub usando Docker
# Sin necesidad de tener Git instalado en el NAS

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  TagMap - Actualización desde GitHub  ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Detectar directorio del proyecto
PROJECT_DIR="/share/homes/DavidPrado/tagmap"

if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Error: No se encuentra el proyecto en $PROJECT_DIR${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

# Detectar rama actual
CURRENT_BRANCH=$(docker run --rm -v $PROJECT_DIR:/git alpine/git -C /git branch --show-current 2>/dev/null || echo "main")
echo -e "${BLUE}📌 Rama actual: ${YELLOW}$CURRENT_BRANCH${NC}"
echo ""

# Hacer backup del .env
if [ -f .env ]; then
    echo -e "${YELLOW}💾 Haciendo backup de .env...${NC}"
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ Backup creado${NC}"
    echo ""
fi

# Ver commits nuevos disponibles
echo -e "${BLUE}🔍 Verificando actualizaciones disponibles...${NC}"
docker run --rm -v $PROJECT_DIR:/git alpine/git -C /git fetch origin

NEW_COMMITS=$(docker run --rm -v $PROJECT_DIR:/git alpine/git -C /git log HEAD..origin/$CURRENT_BRANCH --oneline 2>/dev/null || echo "")

if [ -z "$NEW_COMMITS" ]; then
    echo -e "${GREEN}✅ Ya estás actualizado. No hay cambios nuevos.${NC}"
    exit 0
fi

echo -e "${YELLOW}📋 Commits nuevos disponibles:${NC}"
echo "$NEW_COMMITS"
echo ""

# Preguntar si continuar
read -p "¿Deseas actualizar TagMap? (s/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo -e "${YELLOW}❌ Actualización cancelada${NC}"
    exit 0
fi

# Actualizar código
echo -e "${BLUE}📥 Descargando actualizaciones...${NC}"
docker run --rm -v $PROJECT_DIR:/git alpine/git -C /git pull origin $CURRENT_BRANCH

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al actualizar. Verifica los conflictos.${NC}"
    echo -e "${YELLOW}💡 Puedes descartar cambios locales con:${NC}"
    echo -e "   docker run --rm -v $PROJECT_DIR:/git alpine/git -C /git reset --hard origin/$CURRENT_BRANCH"
    exit 1
fi

echo -e "${GREEN}✅ Código actualizado${NC}"
echo ""

# Restaurar .env
if [ -f .env.backup.* ]; then
    echo -e "${YELLOW}🔧 Restaurando archivo .env...${NC}"
    latest_backup=$(ls -t .env.backup.* | head -1)
    cp "$latest_backup" .env
    echo -e "${GREEN}✅ .env restaurado${NC}"
    echo ""
fi

# Parar contenedores
echo -e "${BLUE}🛑 Deteniendo contenedores...${NC}"
docker compose -f docker-compose.qnap.yml down

# Reconstruir contenedores
echo -e "${BLUE}🔨 Reconstruyendo contenedores...${NC}"
docker compose -f docker-compose.qnap.yml up -d --build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al reconstruir contenedores${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contenedores reconstruidos${NC}"
echo ""

# Esperar a que PostgreSQL esté listo
echo -e "${BLUE}⏳ Esperando a PostgreSQL...${NC}"
sleep 10

# Ejecutar migraciones
echo -e "${BLUE}🔄 Ejecutando migraciones de base de datos...${NC}"
docker compose -f docker-compose.qnap.yml exec -T backend npm run db:migrate

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  No se pudieron ejecutar las migraciones automáticamente${NC}"
    echo -e "${YELLOW}💡 Ejecuta manualmente:${NC}"
    echo -e "   docker compose -f docker-compose.qnap.yml exec backend npm run db:migrate"
else
    echo -e "${GREEN}✅ Migraciones ejecutadas${NC}"
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  ✅ TagMap actualizado correctamente  ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${BLUE}🌐 Accede a: http://192.168.1.201:3000${NC}"
echo ""
echo -e "${YELLOW}💡 Ver logs:${NC}"
echo -e "   docker compose -f docker-compose.qnap.yml logs -f"
echo ""
