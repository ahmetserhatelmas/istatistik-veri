/**
 * forward-sync.mjs — Bugünden itibaren ileriye doğru tüm veriyi çeker / günceller.
 *
 * Kullanım:
 *   node scripts/forward-sync.mjs            → bugün + 90 gün ileri
 *   node scripts/forward-sync.mjs 60         → bugün + 60 gün ileri
 *   node scripts/forward-sync.mjs 0 45       → 45 gün geriden bugüne kadar (geçmiş tamamlama)
 *
 * Davranış:
 *   - DB'de sonuc_ms DOLU (bitmiş) maçlar: ATLANIR (kredi harcanmaz)
 *   - Diğerleri (yeni + yaklaşan + bugün): UPSERT — oran değişiklikleri de güncellenir
 *
 * .env'den okunur (node --env-file gereksiz).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// ── .env yükle ──────────────────────────────────────────────────────────────
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

// ── config ──────────────────────────────────────────────────────────────────
const BASE_URL = process.env.ORAN_BASE_URL || "https://www.oranmerkezi.com";
const BOOKMAKER = "0";
const SPORT = "FUTBOL";
const BATCH_SIZE = 25;
const IN_CHUNK = 200;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function authPayload() {
  return {
    KULLANICI: process.env.ORAN_KULLANICI,
    SIFRE: process.env.ORAN_SIFRE,
    PAROLA: process.env.ORAN_PAROLA,
  };
}

async function apiPost(func, extra = {}) {
  const body = new URLSearchParams({ ...authPayload(), ...extra });
  const res = await fetch(`${BASE_URL}/index.php/DataAPI/${func}.html`, {
    method: "POST",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    },
    body: body.toString(),
  });
  return res.json();
}

async function getMatchIds(dateFrom, dateTo) {
  const raw = await apiPost("MacIdListesi", {
    BOOKMAKER,
    SPORTURU: SPORT,
    "TARIH[0]": dateFrom,
    "TARIH[1]": dateTo,
  });
  if (Array.isArray(raw)) return raw.map(Number);
  return [];
}

function suffixOf(code, n) {
  const s = String(code);
  return s.length >= n ? s.slice(-n) : s;
}

function parseMatch(obj) {
  const id = Number(obj.ID);
  return {
    id,
    tarih: String(obj.TARIH ?? ""),
    saat: obj.SAAT ? String(obj.SAAT) : null,
    tarih_tr_gunlu: obj.TARIH_TR_GUNLU ? String(obj.TARIH_TR_GUNLU) : null,
    lig_kodu: obj.LIGKODU ? String(obj.LIGKODU) : null,
    lig_adi: obj.LIGADI ? String(obj.LIGADI) : null,
    lig_id: obj.LIGID ? Number(obj.LIGID) : null,
    alt_lig_adi: obj.ALTLIGADI ? String(obj.ALTLIGADI) : null,
    alt_lig_id: obj.ALTLIGID ? Number(obj.ALTLIGID) : null,
    sezon_adi: obj.SEZONADI ? String(obj.SEZONADI) : null,
    sezon_id: obj.SEZONID ? Number(obj.SEZONID) : null,
    t1: obj.T1 ? String(obj.T1) : null,
    t2: obj.T2 ? String(obj.T2) : null,
    t1i: obj.T1I ? Number(obj.T1I) : null,
    t2i: obj.T2I ? Number(obj.T2I) : null,
    hakem: obj.HAKEM ? String(obj.HAKEM) : null,
    t1_antrenor: obj.T1ANTRENOR ? String(obj.T1ANTRENOR) : null,
    t2_antrenor: obj.T2ANTRENOR ? String(obj.T2ANTRENOR) : null,
    sonuc_iy: obj.SONUCIY ? String(obj.SONUCIY) : null,
    sonuc_ms: obj.SONUCMS ? String(obj.SONUCMS) : null,
    ft1: obj.FT1 != null ? Number(obj.FT1) : null,
    ft2: obj.FT2 != null ? Number(obj.FT2) : null,
    ht1: obj.HT1 != null ? Number(obj.HT1) : null,
    ht2: obj.HT2 != null ? Number(obj.HT2) : null,
    ms1: obj.MS1 ? String(obj.MS1) : null,
    msx: obj.MSX ? String(obj.MSX) : null,
    ms2: obj.MS2 ? String(obj.MS2) : null,
    iy1: obj.IY1 ? String(obj.IY1) : null,
    iyx: obj.IYX ? String(obj.IYX) : null,
    iy2: obj.IY2 ? String(obj.IY2) : null,
    a: obj.A ? String(obj.A) : null,
    u: obj.U ? String(obj.U) : null,
    kg_var: obj.KGVAR ? String(obj.KGVAR) : null,
    kg_yok: obj.KGYOK ? String(obj.KGYOK) : null,
    kod_ms: obj.KODMS ? Number(obj.KODMS) : null,
    kod_cs: obj.KODCS ? Number(obj.KODCS) : null,
    kod_iy: obj.KODIY ? Number(obj.KODIY) : null,
    kod_au: obj.KODAU ? Number(obj.KODAU) : null,
    mac_suffix4: suffixOf(id, 4),
    mac_suffix3: suffixOf(id, 3),
    mac_suffix2: suffixOf(id, 2),
    sport_turu: SPORT,
    bookmaker_id: Number(BOOKMAKER),
    raw_data: obj,
    updated_at: new Date().toISOString(),
  };
}

async function getMatchDetails(ids) {
  const params = {
    BOOKMAKER,
    SPORTURU: SPORT,
    ORANTURU: "SONGUNCEL",
    ORANFORMATI: "%0.2f",
    BAKIYEDENDUS: "1",
  };
  ids.forEach((mid, i) => {
    params[`MACIDLISTESI[${i}]`] = String(mid);
  });
  const raw = await apiPost("iDdenMacDatasi", params);
  const rows = [];
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) {
      if (/^\d+$/.test(k) && typeof v === "object" && v !== null) {
        rows.push(parseMatch(v));
      }
    }
  }
  return rows;
}

// DB'deki mevcut meta (sonuc_ms durumu) — 200'lük parçalarda
async function fetchDbMeta(ids) {
  const map = new Map();
  for (let j = 0; j < ids.length; j += IN_CHUNK) {
    const slice = ids.slice(j, j + IN_CHUNK);
    const { data } = await supabase
      .from("matches")
      .select("id, sonuc_ms")
      .in("id", slice);
    for (const r of data || []) {
      map.set(r.id, r.sonuc_ms);
    }
  }
  return map;
}

function isFinished(sonuc_ms) {
  if (sonuc_ms == null) return false;
  const s = String(sonuc_ms).trim();
  return s !== "" && s !== "-" && s !== "–";
}

function eachDay(from, to) {
  const days = [];
  const cur = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

// ── main ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const futureDays = Math.max(0, Number(args[0] ?? 90) || 90);
const pastDays = Math.max(0, Number(args[1] ?? 0) || 0);

const now = new Date();
const todayUtc = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
);
const startDate = new Date(todayUtc);
startDate.setUTCDate(startDate.getUTCDate() - pastDays);
const endDate = new Date(todayUtc);
endDate.setUTCDate(endDate.getUTCDate() + futureDays);

const dateFrom = startDate.toISOString().slice(0, 10);
const dateTo = endDate.toISOString().slice(0, 10);
const days = eachDay(dateFrom, dateTo);

console.log("=".repeat(72));
console.log(`forward-sync: ${dateFrom} → ${dateTo} (${days.length} gün)`);
console.log("Strateji: bitmiş (sonuc_ms dolu) → ATLA  |  diğerleri → UPSERT");
console.log("=".repeat(72));

let grandFetched = 0;
let grandUpserted = 0;
let grandSkipped = 0;

for (const day of days) {
  const dayIds = await getMatchIds(day, day);
  if (dayIds.length === 0) continue;

  grandFetched += dayIds.length;

  const dbMeta = await fetchDbMeta(dayIds);
  const toFetch = dayIds.filter((id) => !isFinished(dbMeta.get(id)));
  const skipped = dayIds.length - toFetch.length;
  grandSkipped += skipped;

  if (toFetch.length === 0) {
    process.stdout.write(`${day}  ${dayIds.length} maç → tümü bitmiş, atlandı\n`);
    continue;
  }

  let dayUpserted = 0;
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const chunk = toFetch.slice(i, i + BATCH_SIZE);
    const rows = await getMatchDetails(chunk);
    if (rows.length > 0) {
      const { error } = await supabase
        .from("matches")
        .upsert(rows, { onConflict: "id" });
      if (error) {
        console.error(`  HATA ${day}:`, error.message);
      } else {
        dayUpserted += rows.length;
      }
    }
    await sleep(150);
  }

  grandUpserted += dayUpserted;
  console.log(
    `${day}  API:${dayIds.length}  upsert:${dayUpserted}  atlandı:${skipped}`
  );
}

console.log("=".repeat(72));
console.log(`ÖZET  API toplam: ${grandFetched}  upsert: ${grandUpserted}  atlandı: ${grandSkipped}`);
console.log("=".repeat(72));
