#!/usr/bin/env bash
set -euo pipefail

app_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
service_name="${SERVICE_NAME:-aera-baby-spa}"
branch="${DEPLOY_BRANCH:-main}"

cd "$app_dir"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Deploy dibatalkan: working tree VPS memiliki perubahan lokal." >&2
  exit 1
fi

echo "→ Mengambil origin/$branch"
git pull --ff-only origin "$branch"

echo "→ Memasang dependency production"
npm ci --omit=dev

echo "→ Memasang unit systemd terbaru"
sudo install -m 0644 "$app_dir/deploy/aera-baby-spa.service" "/etc/systemd/system/$service_name.service"
sudo systemctl daemon-reload

echo "→ Menjalankan migrasi dan me-restart $service_name"
if ! sudo systemctl restart "$service_name"; then
  echo "Deploy gagal. Log migrasi/aplikasi terakhir:" >&2
  sudo journalctl -u "$service_name" -n 100 --no-pager >&2
  exit 1
fi
sudo systemctl --no-pager --full status "$service_name"

echo "✔ Deploy selesai pada commit $(git rev-parse --short HEAD)"
