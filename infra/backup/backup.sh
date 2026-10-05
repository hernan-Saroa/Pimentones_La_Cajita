#!/bin/sh
# Respaldo diario de PostgreSQL comprimido, con rotación. Corre dentro del contenedor "backup".
set -eu
DEST=${BACKUP_DIR:-/backups}
KEEP=${BACKUP_KEEP_DAYS:-14}
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST"
pg_dump "$DATABASE_URL" --no-owner --format=custom | gzip > "$DEST/lacajita-$STAMP.dump.gz"
find "$DEST" -name 'lacajita-*.dump.gz' -mtime +"$KEEP" -delete
echo "Respaldo listo: $DEST/lacajita-$STAMP.dump.gz ($(du -h "$DEST/lacajita-$STAMP.dump.gz" | cut -f1))"
