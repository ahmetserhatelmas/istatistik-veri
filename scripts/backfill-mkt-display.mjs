/**
 * `mkt_display` backfill — Supabase SQL Editor zaman aşımından kaçınmak için doğrudan Postgres.
 *
 * DATABASE_URL: Supabase → Connect → **Session pooler** (veya Transaction) URI’sini kopyala.
 * **"Use IPv4 connection"** aç; host `aws-0-….pooler.supabase.com` olmalı — `db.*.supabase.co` çoğu
 * ev ağında ENOTFOUND (yalnızca IPv6) verir.
 *
 *   DATABASE_URL='postgresql://postgres.[ref]:…@aws-0-….pooler.supabase.com:5432/postgres' npm run backfill:mkt
 *
 * `.env.local` / `.env` içinde DATABASE_URL yeterli. CHUNK=800 — daha küçük UPDATE.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFiles() {
  // Önce .env, sonra .env.local — Next.js gibi son dosya kazanır; aynı dosyada tekrarlanan anahtarda son satır kazanır.
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
  console.error(
    "DATABASE_URL gerekli (.env / .env.local). Session pooler + IPv4 URI — bkz. dosya başı yorumu.\n" +
      "Örn: DATABASE_URL='postgresql://postgres.[ref]:…@aws-0-….pooler.supabase.com:5432/postgres' npm run backfill:mkt",
  );
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
ENOTFOUND: genelde \`db.*.supabase.co\` bu makinede DNS’te yok (IPv6-only kayıt).

Ne yap:
• Supabase → Connect → Session pooler (veya Transaction)
• **"Use IPv4 connection"** anahtarını AÇ — URI host’u \`…pooler.supabase.com\` olur (db.… değil).
• O string’i DATABASE_URL olarak .env / .env.local’e yapıştır → npm run backfill:mkt

Not: Şifrede [ ] yok; + → %2B.`);
  }
  process.exit(1);
}
await client.query("SET statement_timeout = 0");

let batch = 0;
let updated = 0;
for (;;) {
  const r = await client.query(
    `WITH cte AS (
      SELECT id FROM public.matches WHERE mkt_display IS NULL ORDER BY id LIMIT $1
    )
    UPDATE public.matches m
    SET mkt_display = public.match_id_mkt_display(m.id)
    FROM cte WHERE m.id = cte.id`,
    [chunk],
  );
  const n = r.rowCount ?? 0;
  batch += 1;
  updated += n;
  const { rows } = await client.query(
    "SELECT count(*)::bigint AS c FROM public.matches WHERE mkt_display IS NULL",
  );
  const rem = Number(rows[0].c);
  console.log(`[${batch}] güncellenen: ${n} — kalan NULL: ${rem} — toplam satır: ${updated}`);
  if (n === 0) break;
}

await client.end();
console.log("mkt_display backfill bitti.");
