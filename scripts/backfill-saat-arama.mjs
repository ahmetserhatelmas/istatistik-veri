/**
 * backfill-saat-arama.mjs — saat_arama kolonunu to_char(saat, 'HH24:MI') ile doldurur.
 *
 * Kullanım:
 *   1) Önce Supabase SQL Editor'de: sql/add-backfill-saat-arama-rpc.sql
 *   2) node scripts/backfill-saat-arama.mjs
 *
 * Çalışma biçimi:
 *   - Önce MIN(id) ve MAX(id) alınır.
 *   - Aralık RANGE_SIZE'lik dilimlere bölünür ve RPC (backfill_saat_arama_range)
 *     paralel CONCURRENCY worker ile çağrılır. Her RPC tek SQL UPDATE'i çalıştırır.
 *   - 57014 (statement_timeout) hatasında aralık otomatik ikiye bölünür ve yeniden denenir.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

function loadDotEnv() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const p = resolve(root, ".env");
  if (!existsSync(p)) return;
  let text = readFileSync(p, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let line of text.split(/\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadDotEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Eksik env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

const RANGE_SIZE = 25000;   // Bir RPC çağrısında güncellenecek id aralığı genişliği
const CONCURRENCY = 1;      // Aynı anda kaç RPC paralel çalışsın (pool'u doldurmamak için sıralı)
const MIN_RANGE = 500;      // Bu değerden küçük aralık ikiye bölünmez
const RETRY_DELAY_MS = 3000;

async function rpcRange(lo, hi) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/backfill_saat_arama_range`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ p_lo: lo, p_hi: hi }),
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`RPC [${lo},${hi}) HTTP ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  const json = await res.json();
  return Number(json) || 0;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Tek aralığı çalıştır; pool/timeout hatasında bekle + retry, gerekirse ikiye böl. */
async function processRange(lo, hi, attempt = 0) {
  try {
    return await rpcRange(lo, hi);
  } catch (e) {
    const body = e.body || "";
    const isPoolBusy = /PGRST003|connection pool|timed out acquiring/i.test(body);
    const isTimeout = /57014|statement timeout|canceling statement/i.test(body);
    const isServerErr = e.status && e.status >= 500;

    if (isPoolBusy && attempt < 5) {
      const wait = RETRY_DELAY_MS * (attempt + 1);
      console.warn(`   ! pool busy [${lo},${hi}) — ${wait}ms bekle, retry ${attempt + 1}/5`);
      await sleep(wait);
      return processRange(lo, hi, attempt + 1);
    }
    if ((isTimeout || isServerErr) && hi - lo > MIN_RANGE) {
      const mid = Math.floor((lo + hi) / 2);
      const a = await processRange(lo, mid);
      const b = await processRange(mid, hi);
      return a + b;
    }
    throw e;
  }
}

async function fetchMinMaxId() {
  // Supabase REST'te aggregate yok; sıralama + limit ile min/max alalım
  const min = await fetch(
    `${SUPABASE_URL}/rest/v1/matches?select=id&order=id.asc&limit=1`,
    { headers: HEADERS },
  ).then((r) => r.json());
  const max = await fetch(
    `${SUPABASE_URL}/rest/v1/matches?select=id&order=id.desc&limit=1`,
    { headers: HEADERS },
  ).then((r) => r.json());
  return { min: Number(min[0]?.id ?? 0), max: Number(max[0]?.id ?? 0) };
}

async function countBacklog() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/matches?select=id&saat=not.is.null&saat_arama=is.null`,
    { method: "HEAD", headers: { ...HEADERS, Prefer: "count=exact", Range: "0-0" } },
  );
  const cr = res.headers.get("content-range") || "";
  const total = Number(cr.split("/")[1]);
  return Number.isFinite(total) ? total : null;
}

async function main() {
  const t0 = Date.now();
  console.log("→ min/max id alınıyor…");
  const { min, max } = await fetchMinMaxId();
  console.log(`   id aralığı: ${min} .. ${max}`);

  console.log("→ Backlog sayılıyor…");
  const totalBacklog = await countBacklog();
  console.log(`   Eksik satır: ${totalBacklog ?? "?"}`);
  if (totalBacklog === 0) {
    console.log("✓ Yapılacak iş yok.");
    return;
  }

  // Aralıkları oluştur
  const jobs = [];
  for (let lo = min; lo <= max; lo += RANGE_SIZE) {
    jobs.push([lo, Math.min(lo + RANGE_SIZE, max + 1)]);
  }
  console.log(`→ ${jobs.length} aralık, ${CONCURRENCY} paralel worker…`);

  let idx = 0;
  let updated = 0;
  let done = 0;

  async function worker() {
    while (true) {
      const my = idx++;
      if (my >= jobs.length) return;
      const [lo, hi] = jobs[my];
      const n = await processRange(lo, hi);
      updated += n;
      done++;
      if (done % 10 === 0 || done === jobs.length) {
        const el = ((Date.now() - t0) / 1000).toFixed(1);
        const pct = ((done / jobs.length) * 100).toFixed(1);
        console.log(
          `   %${pct} — ${done}/${jobs.length} aralık · ${updated} satır güncellendi · ${el}s`,
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()),
  );

  const el = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✓ Bitti. ${updated} satır güncellendi. Süre: ${el}s`);

  console.log("→ Doğrulama…");
  const remaining = await countBacklog();
  console.log(`   Kalan: ${remaining} satır`);
}

main().catch((e) => {
  console.error("Hata:", e.message);
  process.exit(1);
});
