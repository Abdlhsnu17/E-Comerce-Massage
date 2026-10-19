#!/usr/bin/env bash
# Backup harian database dan gambar upload. Jalankan sebagai user yang dapat
# membaca env aplikasi dan menulis BACKUP_DIR, misalnya lewat cron.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Pemakaian: $0 /etc/aera-baby-spa.env" >&2
  exit 64
fi

set -a
source "$1"
set +a

backup_dir="${BACKUP_DIR:-/var/backups/aera-baby-spa}"
uploads_dir="${UPLOADS_DIR:-/var/www/aera-baby-spa/public/uploads}"
keep_days="${BACKUP_RETENTION_DAYS:-14}"
stamp="$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p "$backup_dir"

sql_tmp="$backup_dir/.${DB_NAME}_${stamp}.sql.tmp"
sql_file="$backup_dir/${DB_NAME}_${stamp}.sql.gz"
mysqldump --single-transaction --quick --routines --events \
  -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"${DB_PASSWORD:-}" "$DB_NAME" > "$sql_tmp"
gzip -c "$sql_tmp" > "$sql_file"
rm -f "$sql_tmp"
test -s "$sql_file"

if [[ -d "$uploads_dir" ]]; then
  tar -C "$(dirname "$uploads_dir")" -czf "$backup_dir/uploads_${stamp}.tar.gz" "$(basename "$uploads_dir")"
fi

find "$backup_dir" -type f -mtime +"$keep_days" -name '*.gz' -delete
echo "Backup selesai: $sql_file"
