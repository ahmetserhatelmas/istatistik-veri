#!/usr/bin/env bash
set -euo pipefail

HOST="${PGHOST:-aws-1-ap-southeast-2.pooler.supabase.com}"
PORT="${PGPORT:-5432}"
USER_NAME="${PGUSER:-postgres.bfvsochsnzomypnecrla}"
DB_NAME="${PGDATABASE:-postgres}"
STEP="${BACKFILL_STEP:-500000}"
START_ID="${BACKFILL_START:-0}"
END_ID="${BACKFILL_END:-52000000}"

if [[ -z "${PGPASSWORD:-}" ]]; then
  echo "PGPASSWORD env yok. Ornek: export PGPASSWORD='...'; sonra tekrar calistir." >&2
  exit 1
fi

psql_cmd=(/opt/homebrew/bin/psql -h "$HOST" -p "$PORT" -U "$USER_NAME" -d "$DB_NAME" -v ON_ERROR_STOP=1 -At)

count_sql="SELECT count(*) FROM public.matches WHERE ms1_n IS NULL OR msx_n IS NULL OR ms2_n IS NULL;"

remaining="$(${psql_cmd[@]} -c "$count_sql")"
remaining="${remaining//[[:space:]]/}"
if [[ -z "$remaining" ]]; then
  echo "Baslangic kalan sayisi okunamadi." >&2
  exit 1
fi
if ! [[ "$remaining" =~ ^[0-9]+$ ]]; then
  echo "Baslangic kalan sayisi sayi degil: $remaining" >&2
  exit 1
fi

initial_remaining="$remaining"
if [[ "$initial_remaining" -eq 0 ]]; then
  echo "Kalan yok. Backfill zaten tamam."
  exit 0
fi

start_ts=$(date +%s)
echo "Basladi. Kalan: $initial_remaining satir (step=$STEP, id=$START_ID..$END_ID)"

for ((lo=START_ID; lo<END_ID; lo+=STEP)); do
  hi=$((lo + STEP))
  if ((hi > END_ID)); then hi=$END_ID; fi

  updated="$(${psql_cmd[@]} -c "SET statement_timeout = '0'; SELECT public.backfill_ms_n_range($lo, $hi);")"
  updated="${updated//[[:space:]]/}"
  [[ "$updated" =~ ^[0-9]+$ ]] || updated=0

  remaining="$(${psql_cmd[@]} -c "$count_sql")"
  remaining="${remaining//[[:space:]]/}"
  [[ "$remaining" =~ ^[0-9]+$ ]] || remaining=0

  done_rows=$((initial_remaining - remaining))
  if ((done_rows < 0)); then done_rows=0; fi

  pct=$(awk -v d="$done_rows" -v t="$initial_remaining" 'BEGIN { if (t<=0) print "100.00"; else printf "%.2f", (d*100.0)/t }')

  now_ts=$(date +%s)
  elapsed=$((now_ts - start_ts))
  eta="--"
  if ((done_rows > 0)); then
    sec_per_row=$(awk -v e="$elapsed" -v d="$done_rows" 'BEGIN { printf "%.8f", e/d }')
    eta_sec=$(awk -v s="$sec_per_row" -v r="$remaining" 'BEGIN { printf "%d", s*r }')
    eta=$(printf "%02d:%02d:%02d" $((eta_sec/3600)) $(((eta_sec%3600)/60)) $((eta_sec%60)))
  fi

  echo "[$(date '+%H:%M:%S')] id[$lo,$hi) updated=$updated remaining=$remaining progress=${pct}% eta=$eta"

  if ((remaining == 0)); then
    echo "Tamamlandi."
    break
  fi
done

echo "Son kontrol:"
${psql_cmd[@]} -c "SELECT count(*) AS rows, count(ms1_n) AS ms1_n_dolu, count(msx_n) AS msx_n_dolu, count(ms2_n) AS ms2_n_dolu FROM public.matches;"
