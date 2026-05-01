#!/bin/bash
# Script de diagnóstico para el problema del logo.jpg en QNAP

echo "======================================"
echo "DIAGNÓSTICO LOGO.JPG EN QNAP"
echo "======================================"
echo ""

echo "1. Verificando archivo en código fuente..."
ls -lh /share/homes/DavidPrado/tagmap/frontend/public/logo.jpg 2>/dev/null || echo "❌ No encontrado en frontend/public/"

echo ""
echo "2. Verificando archivo dentro del contenedor frontend..."
sudo docker compose -f docker-compose.qnap.yml exec frontend ls -lh /app/public/logo.jpg 2>/dev/null || echo "❌ No encontrado en /app/public/"

echo ""
echo "3. Listando todo /app/public/ en el contenedor..."
sudo docker compose -f docker-compose.qnap.yml exec frontend ls -lah /app/public/

echo ""
echo "4. Verificando permisos del archivo..."
sudo docker compose -f docker-compose.qnap.yml exec frontend stat /app/public/logo.jpg 2>/dev/null || echo "❌ No se puede leer stat"

echo ""
echo "5. Verificando que middleware excluye .jpg..."
grep -n "\.jpg" /share/homes/DavidPrado/tagmap/frontend/src/middleware.ts

echo ""
echo "6. Probando descarga directa desde el contenedor..."
sudo docker compose -f docker-compose.qnap.yml exec frontend wget -O /tmp/test-logo.jpg http://localhost:3000/logo.jpg 2>&1 | head -5

echo ""
echo "7. Verificando logs del frontend (últimas 20 líneas)..."
sudo docker compose -f docker-compose.qnap.yml logs frontend --tail 20

echo ""
echo "======================================"
echo "FIN DEL DIAGNÓSTICO"
echo "======================================"
