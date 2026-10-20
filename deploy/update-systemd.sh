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

echo "→ Menjalankan migrasi database"
npm run db:migrate

echo "→ Me-restart $service_name"
sudo systemctl restart "$service_name"
sudo systemctl --no-pager --full status "$service_name"

echo "✔ Deploy selesai pada commit $(git rev-parse --short HEAD)"
