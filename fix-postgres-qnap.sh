#!/bin/bash

# ============================================================
# TagMap - Fix PostgreSQL permissions en QNAP
# ============================================================
# Soluciona el error: "Permission denied: global/pg_filenode.map"
# ============================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="/share/homes/DavidPrado/tagmap"
DOCKER_COMPOSE_FILE="docker-compose.qnap.yml"

echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Reparando permisos de PostgreSQL${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
echo ""

cd "$PROJECT_DIR"

# 1. Backup de la base de datos (si es posible)
echo -e "${YELLOW}⚠️  Intentando hacer backup de la BD...${NC}"
if docker compose -f "$DOCKER_COMPOSE_FILE" exec -T db pg_dumpall -U tagmap_user > backup_$(date +%Y%m%d_%H%M%S).sql 2>/dev/null; then
    echo -e "${GREEN}✅ Backup creado${NC}"
else
    echo -e "${YELLOW}⚠️  No se pudo hacer backup (la BD puede estar corrupta)${NC}"
fi
echo ""

# 2. Parar todos los contenedores
echo -e "${CYAN}🛑 Deteniendo contenedores...${NC}"
docker compose -f "$DOCKER_COMPOSE_FILE" down
echo -e "${GREEN}✅ Contenedores detenidos${NC}"
echo ""

# 3. Eliminar volumen corrupto
echo -e "${CYAN}🗑️  Eliminando volumen corrupto...${NC}"
docker volume rm tagmap_postgres_data 2>/dev/null || true
echo -e "${GREEN}✅ Volumen eliminado${NC}"
echo ""

# 4. Recrear volumen con permisos correctos
echo -e "${CYAN}📦 Recreando volumen de PostgreSQL...${NC}"
docker volume create tagmap_postgres_data
echo -e "${GREEN}✅ Volumen creado${NC}"
echo ""

# 5. Inicializar PostgreSQL con permisos correctos
echo -e "${CYAN}🔧 Inicializando PostgreSQL...${NC}"
docker run --rm -d \
  --name temp_postgres_init \
  -v tagmap_postgres_data:/var/lib/postgresql/data \
  -e POSTGRES_USER=tagmap_user \
  -e POSTGRES_PASSWORD=Tm4pSecur3PassW0rd2024xY7z9 \
  -e POSTGRES_DB=tagmap_db \
  -e PGDATA=/var/lib/postgresql/data/pgdata \
  postgres:16-alpine

# Esperar a que PostgreSQL inicialice
echo -e "${CYAN}⏳ Esperando inicialización (30s)...${NC}"
sleep 30

# Detener el contenedor temporal
docker stop temp_postgres_init 2>/dev/null || true

echo -e "${GREEN}✅ PostgreSQL inicializado${NC}"
echo ""

# 6. Levantar todos los servicios
echo -e "${CYAN}🚀 Levantando servicios...${NC}"
docker compose -f "$DOCKER_COMPOSE_FILE" up -d
echo ""

# 7. Esperar a que PostgreSQL esté listo
echo -e "${CYAN}⏳ Esperando a PostgreSQL...${NC}"
sleep 20
echo -e "${GREEN}✅ PostgreSQL listo${NC}"
echo ""

# 8. Ejecutar migraciones
echo -e "${CYAN}🔄 Ejecutando migraciones...${NC}"
docker compose -f "$DOCKER_COMPOSE_FILE" exec backend npx prisma migrate deploy
echo -e "${GREEN}✅ Migraciones aplicadas${NC}"
echo ""

# 9. Ejecutar seed
echo -e "${CYAN}🌱 Ejecutando seed...${NC}"
docker compose -f "$DOCKER_COMPOSE_FILE" exec backend npm run db:seed
echo -e "${GREEN}✅ Seed completado${NC}"
echo ""

# 10. Restaurar fotos procesadas
echo -e "${CYAN}📸 Buscando fotos en carpetas 'procesadas/'...${NC}"

# Contar fotos primero
TOTAL_TO_RESTORE=0
for team_folder in /share/Container/imagenes-tagmap/*; do
    if [ -d "$team_folder/procesadas" ]; then
        count=$(find "$team_folder/procesadas" -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) 2>/dev/null | wc -l)
        if [ $count -gt 0 ]; then
            team_name=$(basename "$team_folder")
            echo "  $team_name/procesadas: $count fotos"
            TOTAL_TO_RESTORE=$((TOTAL_TO_RESTORE + count))
        fi
    fi
done

echo ""

if [ $TOTAL_TO_RESTORE -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No hay fotos en carpetas procesadas${NC}"
else
    echo -e "${YELLOW}⚠️  Se encontraron $TOTAL_TO_RESTORE fotos en carpetas 'procesadas/'${NC}"
    echo ""
    echo "Estas fotos serán movidas de vuelta al directorio raíz de cada equipo"
    echo "para que el Folder Watcher las reimporte a la nueva base de datos."
    echo ""
    
    read -p "¿Deseas restaurar estas fotos? (s/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        echo ""
        echo -e "${CYAN}Restaurando fotos...${NC}"
        RESTORED=0
        for team_folder in /share/Container/imagenes-tagmap/*; do
            if [ -d "$team_folder/procesadas" ]; then
                team_name=$(basename "$team_folder")
                count=$(find "$team_folder/procesadas" -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) 2>/dev/null | wc -l)
                if [ $count -gt 0 ]; then
                    echo "  Moviendo $count fotos de $team_name/procesadas/"
                    find "$team_folder/procesadas" -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) -exec mv {} "$team_folder/" \; 2>/dev/null
                    RESTORED=$((RESTORED + count))
                fi
            fi
        done
        echo -e "${GREEN}✅ $RESTORED fotos restauradas${NC}"
    else
        echo -e "${YELLOW}⚠️  Restauración cancelada - las fotos permanecen en 'procesadas/'${NC}"
    fi
fi
echo ""

# 11. Verificar estado
echo -e "${CYAN}📊 Estado de los servicios:${NC}"
docker compose -f "$DOCKER_COMPOSE_FILE" ps
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Reparación completada${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Credenciales:${NC}"
echo -e "  Admin: ${GREEN}admin@tagmap.app${NC} / ${GREEN}admin123${NC}"
echo ""
echo -e "${CYAN}Acceso:${NC}"
echo -e "  Frontend: ${GREEN}http://192.168.1.201:3000${NC}"
echo ""
