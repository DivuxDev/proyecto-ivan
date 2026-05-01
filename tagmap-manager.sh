#!/bin/bash

# ============================================================
# TagMap - Script de gestión completa para QNAP NAS
# ============================================================
# Instalación, actualización y mantenimiento de TagMap
# Proyecto: /share/homes/DavidPrado/tagmap
# ============================================================

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuración
PROJECT_DIR="/share/homes/DavidPrado/tagmap"
DOCKER_COMPOSE_FILE="docker-compose.qnap.yml"
NAS_IP="192.168.1.201"
IMAGES_ORIGINAL="/share/Container/imagenes-tagmap"
IMAGES_OPTIMIZED="/share/Container/imagenes-tagmap-optimized"

# ============================================================
# Funciones auxiliares
# ============================================================

print_header() {
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker no está instalado"
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose no está instalado"
        exit 1
    fi
    
    print_success "Docker y Docker Compose disponibles"
}

check_directories() {
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "Directorio del proyecto no encontrado: $PROJECT_DIR"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
    
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        print_error "Archivo $DOCKER_COMPOSE_FILE no encontrado"
        exit 1
    fi
    
    print_success "Directorio del proyecto verificado"
}

create_folders() {
    print_info "Creando carpetas necesarias..."
    
    mkdir -p "$IMAGES_ORIGINAL"
    mkdir -p "$IMAGES_OPTIMIZED"
    
    chmod 777 "$IMAGES_ORIGINAL"
    chmod 777 "$IMAGES_OPTIMIZED"
    
    print_success "Carpetas creadas y permisos configurados"
}

wait_for_postgres() {
    print_info "Esperando a que PostgreSQL esté listo..."
    sleep 15
    
    for i in {1..30}; do
        if docker compose -f "$DOCKER_COMPOSE_FILE" exec -T db pg_isready -U tagmap_user &> /dev/null; then
            print_success "PostgreSQL está listo"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    
    print_error "PostgreSQL no responde después de 60 segundos"
    return 1
}

# ============================================================
# Opción 1: Instalación inicial completa
# ============================================================

install_fresh() {
    print_header "INSTALACIÓN INICIAL DE TAGMAP"
    
    print_info "Esta opción instalará TagMap desde cero en tu QNAP"
    echo ""
    read -p "¿Continuar con la instalación? (s/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
        print_warning "Instalación cancelada"
        return
    fi
    
    echo ""
    
    # Verificar requisitos
    check_docker
    check_directories
    
    # Crear carpetas
    create_folders
    
    # Verificar .env
    if [ ! -f .env ]; then
        print_warning "Archivo .env no encontrado"
        
        if [ -f .env.example ]; then
            print_info "Creando .env desde .env.example..."
            cp .env.example .env
            print_success ".env creado"
        else
            print_error ".env.example no encontrado"
            exit 1
        fi
        
        echo ""
        print_warning "IMPORTANTE: Debes editar el archivo .env antes de continuar"
        print_info "Configura especialmente:"
        echo "  - POSTGRES_PASSWORD"
        echo "  - JWT_SECRET"
        echo "  - CORS_ORIGIN (http://$NAS_IP:3000)"
        echo ""
        read -p "¿Ya editaste el archivo .env? (s/n): " -n 1 -r
        echo ""
        
        if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
            print_error "Edita .env y ejecuta este script de nuevo"
            exit 1
        fi
    else
        print_success ".env ya existe"
    fi
    
    echo ""
    print_info "Construyendo imágenes Docker..."
    docker compose -f "$DOCKER_COMPOSE_FILE" build
    
    echo ""
    print_info "Levantando contenedores..."
    docker compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Esperar PostgreSQL
    wait_for_postgres
    
    echo ""
    print_info "Sincronizando schema de base de datos..."
    docker compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npm run db:push
    
    echo ""
    print_info "Creando datos iniciales (seed)..."
    docker compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npm run db:seed
    
    echo ""
    print_success "Estado de contenedores:"
    docker compose -f "$DOCKER_COMPOSE_FILE" ps
    
    echo ""
    print_header "INSTALACIÓN COMPLETADA"
    echo -e "${GREEN}🌐 Accede a TagMap:${NC}"
    echo -e "   ${CYAN}http://$NAS_IP:3000${NC}"
    echo ""
    echo -e "${GREEN}👤 Usuario admin por defecto:${NC}"
    echo -e "   Email:    ${YELLOW}admin@tagmap.app${NC}"
    echo -e "   Password: ${YELLOW}Admin1234!${NC}"
    echo ""
    echo -e "${GREEN}👷 Usuario worker demo:${NC}"
    echo -e "   Email:    ${YELLOW}worker@tagmap.app${NC}"
    echo -e "   Password: ${YELLOW}Worker1234!${NC}"
    echo ""
    print_warning "IMPORTANTE: Cambia las contraseñas después del primer login"
    echo ""
}

# ============================================================
# Opción 2: Actualizar desde GitHub
# ============================================================

update_from_github() {
    print_header "ACTUALIZAR TAGMAP DESDE GITHUB"
    
    check_directories
    
    # Detectar rama actual
    CURRENT_BRANCH=$(docker run --rm -v $PROJECT_DIR:/git alpine/git -C /git branch --show-current 2>/dev/null || echo "main")
    print_info "Rama actual: $CURRENT_BRANCH"
    echo ""
    
    # Hacer backup del .env
    if [ -f .env ]; then
        BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
        print_info "Haciendo backup de .env → $BACKUP_FILE"
        cp .env "$BACKUP_FILE"
        print_success "Backup creado"
        echo ""
    fi
    
    # Ver commits nuevos
    print_info "Verificando actualizaciones disponibles..."
    docker run --rm -v $PROJECT_DIR:/git alpine/git -C /git fetch origin
    
    NEW_COMMITS=$(docker run --rm -v $PROJECT_DIR:/git alpine/git -C /git log HEAD..origin/$CURRENT_BRANCH --oneline 2>/dev/null || echo "")
    
    if [ -z "$NEW_COMMITS" ]; then
        print_success "Ya estás actualizado. No hay cambios nuevos."
        return
    fi
    
    echo ""
    print_warning "Commits nuevos disponibles:"
    echo -e "${CYAN}$NEW_COMMITS${NC}"
    echo ""
    
    read -p "¿Deseas actualizar TagMap? (s/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
        print_warning "Actualización cancelada"
        return
    fi
    
    # Actualizar código
    print_info "Descargando actualizaciones desde GitHub..."
    docker run --rm -v $PROJECT_DIR:/git alpine/git -C /git pull origin $CURRENT_BRANCH
    
    if [ $? -ne 0 ]; then
        print_error "Error al actualizar. Verifica los conflictos."
        echo ""
        print_info "Puedes descartar cambios locales con:"
        echo "  docker run --rm -v $PROJECT_DIR:/git alpine/git -C /git reset --hard origin/$CURRENT_BRANCH"
        return
    fi
    
    print_success "Código actualizado"
    echo ""
    
    # Restaurar .env
    if [ -f "$BACKUP_FILE" ]; then
        print_info "Restaurando archivo .env..."
        cp "$BACKUP_FILE" .env
        print_success ".env restaurado"
        echo ""
    fi
    
    # Parar contenedores
    print_info "Deteniendo contenedores..."
    docker compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Reconstruir
    print_info "Reconstruyendo contenedores con nuevos cambios..."
    docker compose -f "$DOCKER_COMPOSE_FILE" up -d --build
    
    # Esperar PostgreSQL
    wait_for_postgres
    
    # Ejecutar migraciones
    print_info "Ejecutando migraciones de base de datos..."
    docker compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npm run db:migrate 2>/dev/null || {
        print_warning "No hay migraciones disponibles, usando db:push..."
        docker compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npm run db:push
    }
    
    echo ""
    print_header "ACTUALIZACIÓN COMPLETADA"
    echo -e "${GREEN}🌐 Accede a TagMap: ${CYAN}http://$NAS_IP:3000${NC}"
    echo ""
    print_info "Ver logs: docker compose -f $DOCKER_COMPOSE_FILE logs -f"
    echo ""
}

# ============================================================
# Opción 3: Resetear y remigrar base de datos
# ============================================================

reset_database() {
    print_header "RESETEAR Y REMIGRAR BASE DE DATOS"
    
    echo -e "${RED}⚠️  ¡ADVERTENCIA!${NC}"
    echo ""
    echo "Esta opción va a:"
    echo "  1. Eliminar TODOS los datos de la base de datos"
    echo "  2. Recrear la estructura desde cero"
    echo "  3. Ejecutar las migraciones"
    echo "  4. Crear usuarios iniciales (seed)"
    echo "  5. Sincronizar todas las fotos desde el NAS"
    echo ""
    echo -e "${RED}Se perderán:${NC}"
    echo "  - Usuarios (excepto los del seed)"
    echo "  - Fotos registradas en BD (pero no los archivos físicos)"
    echo "  - Todas las configuraciones"
    echo ""
    
    read -p "¿Estás SEGURO de que quieres continuar? (escribe 'SI' en mayúsculas): " -r
    echo ""
    
    if [[ ! $REPLY == "SI" ]]; then
        print_warning "Operación cancelada"
        return
    fi
    
    check_directories
    
    # Hacer backup de la BD actual
    print_info "Haciendo backup de la base de datos actual..."
    BACKUP_SQL="backup_db_$(date +%Y%m%d_%H%M%S).sql"
    
    docker compose -f "$DOCKER_COMPOSE_FILE" exec -T db pg_dump -U tagmap_user tagmap_db > "$BACKUP_SQL" 2>/dev/null || {
        print_warning "No se pudo hacer backup (¿base de datos vacía?)"
    }
    
    if [ -f "$BACKUP_SQL" ]; then
        print_success "Backup guardado en: $BACKUP_SQL"
    fi
    
    echo ""
    
    # Parar contenedores
    print_info "Deteniendo contenedores..."
    docker compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Eliminar volumen de PostgreSQL
    print_info "Eliminando volumen de PostgreSQL..."
    docker volume ls | grep postgres_data | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true
    print_success "Volumen eliminado"
    
    echo ""
    
    # Levantar contenedores
    print_info "Levantando contenedores con base de datos limpia..."
    docker compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Esperar PostgreSQL
    wait_for_postgres
    
    # Sincronizar schema (sin necesidad de migraciones)
    print_info "Sincronizando schema de base de datos..."
    docker compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npm run db:push
    print_success "Schema sincronizado"
    
    echo ""
    
    # Ejecutar seed
    print_info "Creando usuarios iniciales..."
    docker compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npm run db:seed
    print_success "Usuarios creados"
    
    echo ""
    
    # Sincronizar fotos desde el NAS
    print_info "Sincronizando fotos desde el NAS..."
    echo ""
    
    sync_photos_from_nas
    
    echo ""
    print_header "BASE DE DATOS RESETEADA Y MIGRADA"
    echo -e "${GREEN}🌐 Accede a TagMap: ${CYAN}http://$NAS_IP:3000${NC}"
    echo ""
    echo -e "${GREEN}👤 Usuario admin:${NC}"
    echo -e "   Email:    ${YELLOW}admin@tagmap.app${NC}"
    echo -e "   Password: ${YELLOW}Admin1234!${NC}"
    echo ""
    print_info "Backup de BD anterior guardado en: $BACKUP_SQL"
    echo ""
}

# ============================================================
# Función auxiliar: Sincronizar fotos desde NAS
# ============================================================

sync_photos_from_nas() {
    print_info "Escaneando carpetas de equipos en: $IMAGES_ORIGINAL"
    echo ""
    
    if [ ! -d "$IMAGES_ORIGINAL" ]; then
        print_error "Carpeta $IMAGES_ORIGINAL no existe"
        return
    fi
    
    # Contar fotos disponibles
    TOTAL_PHOTOS=0
    for team_folder in "$IMAGES_ORIGINAL"/*; do
        if [ -d "$team_folder" ]; then
            team_name=$(basename "$team_folder")
            
            # Contar fotos (jpg, jpeg, png)
            photo_count=$(find "$team_folder" -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) ! -name "*_opt.jpg" 2>/dev/null | wc -l)
            
            if [ $photo_count -gt 0 ]; then
                echo -e "  ${CYAN}📁 $team_name${NC}: $photo_count fotos"
                TOTAL_PHOTOS=$((TOTAL_PHOTOS + photo_count))
            fi
        fi
    done
    
    echo ""
    
    if [ $TOTAL_PHOTOS -eq 0 ]; then
        print_warning "No se encontraron fotos en $IMAGES_ORIGINAL"
        echo ""
        print_info "Para usar el Folder Watcher, organiza las fotos así:"
        echo "  $IMAGES_ORIGINAL/"
        echo "    ├── Equipo-Norte/"
        echo "    │   └── foto1.jpg"
        echo "    ├── Equipo-Sur/"
        echo "    │   └── foto2.jpg"
        echo "    └── Equipo-Centro/"
        echo "        └── foto3.jpg"
        return
    fi
    
    print_success "Total de fotos encontradas: $TOTAL_PHOTOS"
    echo ""
    
    # Verificar que Folder Watcher está habilitado
    FOLDER_WATCHER_ENABLED=$(grep -E "^ENABLE_FOLDER_WATCHER=" .env | cut -d '=' -f2 || echo "false")
    
    if [ "$FOLDER_WATCHER_ENABLED" != "true" ]; then
        print_warning "Folder Watcher está deshabilitado en .env"
        echo ""
        read -p "¿Deseas habilitarlo ahora? (s/n): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[SsYy]$ ]]; then
            sed -i 's/ENABLE_FOLDER_WATCHER=.*/ENABLE_FOLDER_WATCHER=true/' .env
            print_success "Folder Watcher habilitado"
            
            # Reiniciar backend para aplicar cambios
            print_info "Reiniciando backend..."
            docker compose -f "$DOCKER_COMPOSE_FILE" restart backend
            sleep 5
        else
            print_warning "Las fotos NO serán importadas automáticamente"
            return
        fi
    fi
    
    echo ""
    print_success "Folder Watcher habilitado"
    print_info "Las fotos se importarán automáticamente cada 60 segundos"
    echo ""
    print_info "Para ver el progreso en tiempo real:"
    echo -e "  ${CYAN}docker compose -f $DOCKER_COMPOSE_FILE logs -f backend${NC}"
    echo ""
}

# ============================================================
# Opción 4: Ver estado y logs
# ============================================================

show_status() {
    print_header "ESTADO DE TAGMAP"
    
    check_directories
    
    echo -e "${CYAN}📊 Estado de contenedores:${NC}"
    echo ""
    docker compose -f "$DOCKER_COMPOSE_FILE" ps
    echo ""
    
    echo -e "${CYAN}📁 Carpetas configuradas:${NC}"
    echo "  Imágenes originales:  $IMAGES_ORIGINAL"
    echo "  Imágenes optimizadas: $IMAGES_OPTIMIZED"
    echo ""
    
    if [ -d "$IMAGES_ORIGINAL" ]; then
        echo -e "${CYAN}📸 Fotos por equipo:${NC}"
        for team_folder in "$IMAGES_ORIGINAL"/*; do
            if [ -d "$team_folder" ]; then
                team_name=$(basename "$team_folder")
                photo_count=$(find "$team_folder" -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) ! -name "*_opt.jpg" 2>/dev/null | wc -l)
                processed_count=$(find "$team_folder/procesadas" -type f 2>/dev/null | wc -l || echo "0")
                echo "  $team_name: $photo_count pendientes, $processed_count procesadas"
            fi
        done
        echo ""
    fi
    
    echo -e "${CYAN}🔧 Configuración (.env):${NC}"
    if [ -f .env ]; then
        echo "  CORS_ORIGIN: $(grep CORS_ORIGIN .env | cut -d '=' -f2)"
        echo "  FOLDER_WATCHER: $(grep ENABLE_FOLDER_WATCHER .env | cut -d '=' -f2)"
        echo "  SCAN_INTERVAL: $(grep SCAN_INTERVAL_SECONDS .env | cut -d '=' -f2) segundos"
    fi
    echo ""
    
    echo -e "${CYAN}🌐 Acceso:${NC}"
    echo -e "  ${GREEN}http://$NAS_IP:3000${NC}"
    echo ""
    
    read -p "¿Deseas ver los logs en tiempo real? (s/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        echo ""
        print_info "Mostrando logs (Ctrl+C para salir)..."
        echo ""
        docker compose -f "$DOCKER_COMPOSE_FILE" logs -f
    fi
}

# ============================================================
# Menú principal
# ============================================================

show_menu() {
    clear
    echo -e "${MAGENTA}════════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}          TagMap - Gestión para QNAP NAS           ${NC}"
    echo -e "${MAGENTA}════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}Proyecto:${NC} $PROJECT_DIR"
    echo -e "${CYAN}Docker Compose:${NC} $DOCKER_COMPOSE_FILE"
    echo ""
    echo -e "${GREEN}1.${NC} 🚀 Instalación inicial completa"
    echo -e "${GREEN}2.${NC} 🔄 Actualizar desde GitHub"
    echo -e "${GREEN}3.${NC} 🗄️  Resetear y remigrar base de datos (+ sincronización)"
    echo -e "${GREEN}4.${NC} 📊 Ver estado y logs"
    echo -e "${GREEN}5.${NC} 🚪 Salir"
    echo ""
    echo -e "${YELLOW}════════════════════════════════════════════════════${NC}"
    echo ""
}

# ============================================================
# Loop principal
# ============================================================

main() {
    while true; do
        show_menu
        read -p "Selecciona una opción [1-5]: " choice
        echo ""
        
        case $choice in
            1)
                install_fresh
                ;;
            2)
                update_from_github
                ;;
            3)
                reset_database
                ;;
            4)
                show_status
                ;;
            5)
                print_info "¡Hasta luego!"
                exit 0
                ;;
            *)
                print_error "Opción inválida. Selecciona 1-5"
                sleep 2
                ;;
        esac
        
        echo ""
        read -p "Presiona Enter para continuar..."
    done
}

# Ejecutar script
main
