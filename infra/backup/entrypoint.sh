#!/bin/sh
# Programa el respaldo con cron (por defecto a las 3:00 a. m. hora Bogotá) y hace uno al arrancar.
set -eu
export TZ=${TZ:-America/Bogota}
echo "${BACKUP_CRON:-0 3 * * *} /scripts/backup.sh >> /proc/1/fd/1 2>&1" > /etc/crontabs/root
/scripts/backup.sh || true
exec crond -f -l 2
