// Geçici: raw_data içindeki tüm alanları bir maçtan yazdır
// node scripts/check-raw.mjs

import { readFileSync } from "fs";
const env = readFileSync(".env", "utf8");
env.split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim();
});

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const limit = Number(process.argv[2]) || 50;

/** Oran MBS: 1–3 (readMbsFromOranRecord ile aynı fikir) */
function coerceMbsDigit(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^[1-3]$/.test(s)) return s;
  const n = Number(String(s).replace(",", "."));
  if (Number.isInteger(n) && n >= 1 && n <= 3) return String(n);
  return null;
}

function collectMbsCandidates(rd) {
  const out = [];
  if (!rd || typeof rd !== "object") return out;
  for (const [k, v] of Object.entries(rd)) {
    const t = coerceMbsDigit(v);
    if (t) out.push({ path: k, val: t });
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v)) {
        const t2 = coerceMbsDigit(v2);
        if (t2) out.push({ path: `${k}.${k2}`, val: t2 });
      }
    }
  }
  return out;
}

const { data } = await sb.from("matches").select("id, mac_suffix4, raw_data").limit(limit);

const agg = new Map(); // path -> { count, sampleIds: Set }
for (const row of data || []) {
  const rd = row.raw_data;
  const cands = collectMbsCandidates(rd);
  for (const { path, val } of cands) {
    const key = `${path}=${val}`;
    let a = agg.get(key);
    if (!a) {
      a = { count: 0, ids: [] };
      agg.set(key, a);
    }
    a.count++;
    if (a.ids.length < 5) a.ids.push(row.id);
  }
}

const sorted = [...agg.entries()].sort((a, b) => b[1].count - a[1].count);
console.log(`Özet: ${data?.length ?? 0} satır, değeri 1–3 olan (üst + 1 iç seviye) path sayısı: ${sorted.length}\n`);
console.log("path=değer | satır_sayısı | örnek id’ler");
for (const [k, v] of sorted.slice(0, 80)) {
  console.log(`${k} | ${v.count} | ${v.ids.join(", ")}`);
}

for (const row of (data || []).slice(0, 3)) {
  console.log("\n--- örnek id:", row.id, "| mac_suffix4:", row.mac_suffix4);
  const rd = row.raw_data;
  const mbsKeys = Object.keys(rd).filter(
    (k) =>
      k.toUpperCase() === "MB" ||
      k.toUpperCase() === "MBS" ||
      (k.toUpperCase().includes("MBS") && !k.toUpperCase().includes("KOD")),
  );
  console.log("MB / MBS adlı üst anahtarlar:", mbsKeys.length ? mbsKeys : "(yok)");
  const first30 = Object.entries(rd)
    .slice(0, 30)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  console.log("İlk 30 alan:", first30);
}
