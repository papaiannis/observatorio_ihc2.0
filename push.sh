#!/bin/bash
# ─────────────────────────────────────────────────────────────
# push.sh — Sincroniza y sube cambios de forma segura
# Uso: ./push.sh "mensaje del commit"
# ─────────────────────────────────────────────────────────────

set -e  # Detener si cualquier comando falla

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# ── 1. Verificar que estemos en la raíz del repo ──────────────
echo "📂 Raíz del repo: $REPO_ROOT"

# ── 2. Bajar cambios remotos antes de cualquier cosa ─────────
echo "⬇️  Bajando cambios remotos..."
git pull --rebase origin main

# ── 3. Ver qué hay para subir ─────────────────────────────────
git status --short

# ── 4. Agregar todo ───────────────────────────────────────────
git add -A

# ── 5. Confirmar que hay algo para subir ──────────────────────
if git diff --cached --quiet; then
  echo "✅ No hay cambios nuevos para subir."
  exit 0
fi

# ── 6. Commit con el mensaje pasado como argumento ───────────
MSG="${1:-"actualización $(date +'%Y-%m-%d %H:%M')"}"
git commit -m "$MSG"

# ── 7. Push ──────────────────────────────────────────────────
echo "⬆️  Subiendo cambios..."
git push origin main

echo "✅ ¡Listo! Cambios subidos correctamente."
