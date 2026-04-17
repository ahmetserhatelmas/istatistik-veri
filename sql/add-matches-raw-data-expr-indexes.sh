#!/usr/bin/env bash
# raw_data JSONB sütunundaki tüm anahtarlar için btree expression index oluşturur.
# Supabase SQL Editor zaman aşımını atlatmak için psql üzerinden çalışır.
#
# Kullanım:
#   export DATABASE_URL="postgresql://postgres:[SIFRE]@[HOST]:5432/postgres"
#   bash sql/add-matches-raw-data-expr-indexes.sh
#
# DATABASE_URL bulunamazsa PGHOST / PGUSER / PGPASSWORD / PGDATABASE env değişkenlerine bakar.

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL tanımlı değil. PGHOST/PGUSER/PGPASSWORD/PGDATABASE kullanılıyor…"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> raw_data anahtarları sorgulanıyor…"

# 1. Adım: CREATE INDEX ifadelerini üret
STMTS=$(psql "${DATABASE_URL:-}" \
  --tuples-only \
  --no-align \
  -f "$SCRIPT_DIR/add-matches-raw-data-expr-indexes.sql" \
  2>/dev/null | grep -v '^$')

COUNT=$(echo "$STMTS" | wc -l | tr -d ' ')
echo "==> ${COUNT} anahtar bulundu, indexler oluşturuluyor…"
echo ""

# 2. Adım: Her CREATE INDEX CONCURRENTLY satırını ayrı transaction'da çalıştır
DONE=0
SKIP=0
while IFS= read -r stmt; do
  [ -z "$stmt" ] && continue
  # Index adını log için çıkar
  idx=$(echo "$stmt" | grep -oP 'idx_matches_raw_[a-z0-9_]+' || echo "?")
  printf "  [%3d/%3d] %s … " "$((DONE+SKIP+1))" "$COUNT" "$idx"
  RESULT=$(psql "${DATABASE_URL:-}" --tuples-only --no-align -c "$stmt" 2>&1)
  if echo "$RESULT" | grep -q "already exists"; then
    echo "atlandı (zaten var)"
    ((SKIP++)) || true
  else
    echo "OK"
    ((DONE++)) || true
  fi
done <<< "$STMTS"

echo ""
echo "==> Tamamlandı: ${DONE} yeni index oluşturuldu, ${SKIP} atlandı."
