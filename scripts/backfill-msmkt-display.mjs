/**
 * `msmkt_display` backfill — doğrudan Postgres (Supabase SQL Editor timeout’u için).
 *
 *   DATABASE_URL='postgresql://...' npm run backfill:msmkt
 *
 * CHUNK=800 — tek UPDATE daha kısa sürer.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFiles() {
  for (const name of [".env", ".env.local"]) {
    const p = resolve(root, name);
    if (!existsSync(p)) continue;
    let text = readFileSync(p, "utf8");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      process.env[k] = v;
    }
  }
}

loadEnvFiles();

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL gerekli. Örn: DATABASE_URL='postgresql://...' npm run backfill:msmkt");
  process.exit(1);
}

const chunk = Math.max(100, Math.min(20_000, Number(process.env.CHUNK || "1500")));

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
} catch (e) {
  const err = /** @type {{ code?: string; message?: string }} */ (e);
  const m = err?.message ?? String(e);
  console.error("Postgres bağlantısı kurulamadı:", m);
  if (err?.code === "ENOTFOUND" || /ENOTFOUND/i.test(m)) {
    console.error(`
ENOTFOUND: Session/Transaction pooler + "Use IPv4 connection"; host …pooler.supabase.com — bkz. backfill-mkt-display.mjs başlığı.`);
  }
  process.exit(1);
}
await client.query("SET statement_timeout = 0");

let batch = 0;
let updated = 0;
for (;;) {
  const r = await client.query(
    `WITH cte AS (
      SELECT id FROM public.matches WHERE msmkt_display IS NULL ORDER BY id LIMIT $1
    )
    UPDATE public.matches m
    SET msmkt_display = public.kod_ms_digit_sum_display(m.kod_ms)
    FROM cte WHERE m.id = cte.id`,
    [chunk],
  );
  const n = r.rowCount ?? 0;
  batch += 1;
  updated += n;
  const { rows } = await client.query(
    "SELECT count(*)::bigint AS c FROM public.matches WHERE msmkt_display IS NULL",
  );
  const rem = Number(rows[0].c);
  console.log(`[${batch}] güncellenen: ${n} — kalan NULL: ${rem} — toplam satır: ${updated}`);
  if (n === 0) break;
}

await client.end();
console.log("msmkt_display backfill bitti.");
