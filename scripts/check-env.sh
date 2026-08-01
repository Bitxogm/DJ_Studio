#!/usr/bin/env bash
# Compara las variables que el código (backend/frontend) requiere vía process.env
# contra las declaradas en .env.example. Falla si falta alguna.
# No imprime valores en ningún momento, solo nombres de variables.
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_EXAMPLE=".env.example"

if [ ! -f "$ENV_EXAMPLE" ]; then
  echo "❌ No se encuentra $ENV_EXAMPLE"
  exit 1
fi

declared_vars=$(grep -oE '^[A-Z_][A-Z0-9_]*=' "$ENV_EXAMPLE" | sed 's/=$//' | sort -u)

required_vars=$(grep -rhoE 'process\.env\.[A-Z_][A-Z0-9_]*' \
  apps/backend/src apps/frontend/src packages/shared/src 2>/dev/null \
  | sed 's/process\.env\.//' | sort -u)

missing=""
for var in $required_vars; do
  if ! grep -qx "$var" <<<"$declared_vars"; then
    missing="$missing $var"
  fi
done

if [ -n "$missing" ]; then
  echo "❌ Variables usadas en el código pero ausentes en $ENV_EXAMPLE:"
  for var in $missing; do
    echo "   - $var"
  done
  exit 1
fi

echo "✅ Todas las variables requeridas por el código están declaradas en $ENV_EXAMPLE"
