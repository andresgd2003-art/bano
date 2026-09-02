#!/usr/bin/env bash
# Levanta el Postgres con pgvector dedicado a BANO.
#
# Se ejecuta EN EL VPS. Es idempotente: si el contenedor ya existe, no hace nada.
#
# Por que un contenedor aparte y no la base de n8n (ADR-0001):
#   la base de n8n guarda 47 workflows, 9 activos, uno atendiendo clientes reales.
#   Cambiarle la imagen para habilitar pgvector arriesga eso por ~40 MB de RAM.
#
# Por que `docker run` y no un servicio de Easypanel:
#   la red `easypanel-n8n` es overlay y attachable, asi que un contenedor suelto
#   se une a ella y n8n lo resuelve por nombre. Queda fuera del panel, pero este
#   script es el registro reproducible que un clic en la UI no dejaria.
set -euo pipefail

NOMBRE=bano_postgres
RED=easypanel-n8n
VOLUMEN=bano_pgdata
IMAGEN=pgvector/pgvector:pg17
BD=bano
USUARIO=bano

if docker ps -a --format '{{.Names}}' | grep -qx "$NOMBRE"; then
  echo "El contenedor $NOMBRE ya existe. Nada que hacer."
  docker ps --filter "name=$NOMBRE" --format '  {{.Names}} | {{.Image}} | {{.Status}}'
  exit 0
fi

# La contrasena se genera aqui y se imprime UNA vez: guardala en el .env local.
CLAVE="${BANO_PG_PASSWORD:-$(openssl rand -base64 24 | tr -d '\n/+=')}"

docker volume create "$VOLUMEN" >/dev/null

# Sin -p: la base NO se publica a internet. Solo es alcanzable dentro de la red overlay.
docker run -d \
  --name "$NOMBRE" \
  --network "$RED" \
  --restart unless-stopped \
  -v "$VOLUMEN":/var/lib/postgresql/data \
  -e POSTGRES_DB="$BD" \
  -e POSTGRES_USER="$USUARIO" \
  -e POSTGRES_PASSWORD="$CLAVE" \
  "$IMAGEN" >/dev/null

echo "Esperando a que Postgres acepte conexiones..."
for i in $(seq 1 30); do
  if docker exec "$NOMBRE" pg_isready -U "$USUARIO" -d "$BD" >/dev/null 2>&1; then break; fi
  sleep 2
done

docker exec "$NOMBRE" psql -U "$USUARIO" -d "$BD" -c 'CREATE EXTENSION IF NOT EXISTS vector;' >/dev/null
VER=$(docker exec "$NOMBRE" psql -U "$USUARIO" -d "$BD" -tAc "select extversion from pg_extension where extname='vector';")

echo
echo "Listo."
echo "  host (desde n8n): $NOMBRE"
echo "  puerto:           5432"
echo "  base:             $BD"
echo "  usuario:          $USUARIO"
echo "  contrasena:       $CLAVE"
echo "  pgvector:         $VER"
echo
echo "Guarda la contrasena en BANO_PG_PASSWORD del .env local. No se vuelve a mostrar."
