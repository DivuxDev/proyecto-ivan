# Solución: Error de permisos PostgreSQL en QNAP

## 🔴 Error encontrado

```
FATAL: could not open file "global/pg_filenode.map": Permission denied
```

Este error ocurre cuando el volumen de PostgreSQL en QNAP se crea con permisos incorrectos.

---

## ✅ Solución rápida (5 minutos)

### Paso 1: Conectar al NAS por SSH

```bash
ssh DavidPrado@192.168.1.201
```

### Paso 2: Ir al directorio del proyecto

```bash
cd /share/homes/DavidPrado/tagmap
```

### Paso 3: Ejecutar el script de reparación

```bash
sudo bash fix-postgres-qnap.sh
```

El script hará:
1. ✅ Intenta backup de la BD (si es posible)
2. ✅ Para todos los contenedores
3. ✅ Elimina el volumen corrupto
4. ✅ Recrea el volumen con permisos correctos
5. ✅ Inicializa PostgreSQL correctamente
6. ✅ Levanta todos los servicios
7. ✅ Ejecuta migraciones y seed
8. ✅ **Restaura fotos desde carpetas `procesadas/`**
9. ✅ Muestra estado final

**Importante**: Las fotos que estaban en las carpetas `procesadas/` se moverán de vuelta al directorio raíz de cada equipo para que el Folder Watcher las reimporte automáticamente.

### Paso 4: Verificar que funciona

```bash
# Ver logs del backend (debe estar sin errores)
docker compose -f docker-compose.qnap.yml logs backend --tail=50

# Ver logs de PostgreSQL (debe estar sin errores)
docker compose -f docker-compose.qnap.yml logs db --tail=50

# Verificar que los contenedores están corriendo
docker compose -f docker-compose.qnap.yml ps
```

Deberías ver algo como:
```
NAME              STATUS
tagmap_backend    Up (healthy)
tagmap_db         Up (healthy)
tagmap_frontend   Up
```

### Paso 5: Probar el login

Ir a http://192.168.1.201:3000 y hacer login con:
- Email: `admin@tagmap.app`
- Password: `admin123`

---

## 🔍 ¿Qué causó el problema?

Container Station de QNAP a veces crea volúmenes de Docker con permisos de root (UID 0), pero PostgreSQL necesita ejecutarse como usuario `postgres` (UID 999). Cuando PostgreSQL intenta acceder a sus archivos de datos, el sistema operativo le niega el acceso.

---

## 🛡️ Prevención futura

El archivo `docker-compose.qnap.yml` ahora incluye:

```yaml
db:
  user: "999:999"  # Usuario postgres estándar
  environment:
    PGDATA: /var/lib/postgresql/data/pgdata
```

Esto asegura que:
- PostgreSQL siempre se ejecute con el UID/GID correcto (999)
- Los datos se guarden en un subdirectorio para evitar conflictos

---

## 🆘 Si el script falla

### Opción A: Eliminar y empezar de cero

```bash
cd /share/homes/DavidPrado/tagmap

# Parar y eliminar todo
docker compose -f docker-compose.qnap.yml down -v

# Eliminar volumen manualmente
docker volume rm tagmap_postgres_data

# Levantar servicios
docker compose -f docker-compose.qnap.yml up -d

# Esperar 30 segundos
sleep 30

# Ejecutar migraciones
docker compose -f docker-compose.qnap.yml exec backend npx prisma migrate deploy

# Ejecutar seed
docker compose -f docker-compose.qnap.yml exec backend npm run db:seed
```

### Opción B: Reparación manual de permisos

```bash
# Conectar al contenedor de PostgreSQL
docker exec -it tagmap_db sh

# Dentro del contenedor:
chown -R postgres:postgres /var/lib/postgresql/data
chmod -R 700 /var/lib/postgresql/data
exit

# Reiniciar el contenedor
docker restart tagmap_db
```

---

## 📊 Verificación completa

Después de la reparación, ejecuta:

```bash
# Verificar estado de servicios
docker compose -f docker-compose.qnap.yml ps

# Ver logs del backend (últimas 100 líneas)
docker compose -f docker-compose.qnap.yml logs backend --tail=100

# Verificar que el Folder Watcher funciona
docker compose -f docker-compose.qnap.yml logs backend --tail=20 | grep "Escaneando"

# Verificar usuarios en la BD
docker compose -f docker-compose.qnap.yml exec db psql -U tagmap_user -d tagmap_db -c "SELECT email, name, role FROM \"User\";"
```

Deberías ver:
```
           email           |   name    | role
---------------------------+-----------+-------
 admin@tagmap.app          | Admin     | ADMIN
```

---

## 📝 Notas importantes

1. **Datos perdidos**: Si la base de datos estaba corrupta, se perderán los datos. Las fotos en `/share/Container/imagenes-tagmap/` se reimportarán automáticamente.

2. **Fotos procesadas**: El script mueve automáticamente las fotos de las carpetas `procesadas/` de vuelta al directorio raíz para que se reimporte. Esto asegura que todas las fotos se registren en la nueva base de datos.

3. **Backup automático**: El script intenta hacer backup antes de borrar, pero si la BD está corrupta, el backup fallará.

4. **Credenciales por defecto**: Después de la reparación, las credenciales vuelven a ser:
   - Admin: `admin@tagmap.app` / `admin123`

5. **Reimportación automática**: Si hay fotos en las carpetas de equipos, el Folder Watcher las detectará automáticamente cada 60 segundos. Puedes ver el progreso en los logs del backend.

---

## 🔗 Enlaces útiles

- Documentación de PostgreSQL: https://www.postgresql.org/docs/
- Docker volumes en QNAP: https://docs.qnap.com/
- Prisma troubleshooting: https://www.prisma.io/docs/guides/database/troubleshooting
