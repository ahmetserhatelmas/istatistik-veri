/**
 * match_raw_kod_suffix tablosunu keyset ile doldurur: WHERE id > cursor ORDER BY id LIMIT n.
 * Yalnızca gerçek satırlar taranır (count << max(id) iken id-aralığı döngüsünden çok daha az tur).
 * Timeout olursa batch boyutunu yarılar; 502/503 gibi geçici ağ hatalarında birkaç kez bekleyip tekrar dener.
 * Cursor `.backfill-progress` dosyasına yazılır.
 *
 * Kullanım:
 *   npm run backfill:kod-suffix              (varsayılan batch: 800 satır)
 *   npm run backfill:kod-suffix -- 1200      (daha geniş batch)
 *   npm run backfill:kod-suffix -- 800 true  (cursor 0’dan; progress sıfırla)
 *
 * Eski id-aralığı script’iyle aynı dosya adı: önceki koşudan kalan progress büyük bir sayıysa
 * keyset için `true` ile sıfırlayın (yoksa o id’den sonrası atlanmış gibi görünür).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROGRESS_FILE = resolve(ROOT, ".backfill-progress");

function loadDotEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = resolve(ROOT, name);
    if (!existsSync(p)) continue;
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}
loadDotEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Eksik: NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY (.env / .env.local)");
  process.exit(1);
}

const defaultBatch = 800;
const initialBatch = Math.max(100, Math.min(5000, Number(process.argv[2]) || defaultBatch));
const forceReset = process.argv[3] === "true";
const MIN_BATCH = 50;

const supabase = createClient(url, key);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** @param {import("@supabase/supabase-js").PostgrestError | Error | unknown} error */
function isTransientHttpError(error) {
  const msg = String((error && typeof error === "object" && "message" in error && error.message) || error);
  const code =
    error && typeof error === "object" && "code" in error && error.code != null ? String(error.code) : "";
  if (/timeout|57014/i.test(msg + code)) return false;
  return (
    /502|503|504|5xx|Bad gateway|bad gateway|ECONNRESET|ETIMEDOUT|fetch failed|socket hang up|cloudflare/i.test(
      msg,
    ) || ["502", "503", "504"].includes(code)
  );
}

async function callKeyset(p_after, p_limit) {
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await supabase.rpc("backfill_match_raw_kod_suffix_keyset", {
      p_after: p_after,
      p_limit: p_limit,
    });
    if (!res.error) return res;
    if (!isTransientHttpError(res.error) || attempt === maxAttempts) return res;
    const waitMs = Math.min(30_000, 1500 * 2 ** (attempt - 1));
    console.log(`  Geçici sunucu/ağ hatası — ${waitMs}ms sonra yeniden (deneme ${attempt}/${maxAttempts})`);
    await sleep(waitMs);
  }
}

function saveProgress(afterId) {
  writeFileSync(PROGRESS_FILE, String(afterId), "utf8");
}

function loadProgress() {
  if (forceReset || !existsSync(PROGRESS_FILE)) return null;
  const raw = readFileSync(PROGRESS_FILE, "utf8").trim();
  if (!raw) return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}

/**
 * @returns {Promise<{ ok: true, next: number | null, inserted: number } | { ok: false, error: unknown }>}
 */
async function processKeysetBatch(after, limit) {
  const { data, error } = await callKeyset(after, limit);
  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    const nextRaw = row?.next_cursor;
    const next = nextRaw != null && nextRaw !== "" ? Number(nextRaw) : null;
    const inserted = Number(row?.rows_inserted ?? 0) || 0;
    return { ok: true, next: Number.isFinite(next) ? next : null, inserted };
  }

  const isTimeout = /timeout|57014/i.test(String(error.message) + (error.code ?? ""));
  if (isTimeout && limit > MIN_BATCH) {
    const half = Math.max(MIN_BATCH, Math.floor(limit / 2));
    console.log(`  Timeout (after=${after}) — batch ${limit} → ${half}`);
    return processKeysetBatch(after, half);
  }
  return { ok: false, error };
}

async function main() {
  const saved = loadProgress();
  let after = forceReset ? 0 : saved ?? 0;

  if (forceReset) console.log("▶ Cursor sıfırlandı (p_after = 0).");
  else if (saved != null && saved > 0) console.log(`▶ Devam: son işlenen id = ${saved}, sonraki: id > ${saved}`);

  console.log(`Keyset batch: ${initialBatch} satır | başlangıç p_after = ${after}`);

  let batchNum = 0;
  for (;;) {
    const r = await processKeysetBatch(after, initialBatch);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    batchNum += 1;
    console.log(`  #${batchNum}  p_after=${after}  →  next_cursor=${r.next ?? "∅"}  inserted=${r.inserted}`);

    if (r.next == null) {
      console.log("\nTüm satırlar işlendi.");
      break;
    }
    after = r.next;
    saveProgress(after);
  }

  try {
    writeFileSync(PROGRESS_FILE, "", "utf8");
  } catch {}
  console.log("\nTamamlandı. Supabase SQL Editor’da bir kez: ANALYZE public.match_raw_kod_suffix;");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
