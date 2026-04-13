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

const { data } = await sb.from("matches").select("id, mac_suffix4, raw_data").limit(3);
for (const row of data) {
  console.log("id:", row.id, "| mac_suffix4:", row.mac_suffix4);
  const rd = row.raw_data;
  // MBS ile ilgili alanlar
  const mbsKeys = Object.keys(rd).filter(k => k.toUpperCase().includes("MBS") || k.toUpperCase().includes("MUSTER") || k.toUpperCase().includes("SUFFIX") || k === "S4" || k === "S3");
  console.log("MBS ilgili alanlar:", mbsKeys);
  // İlk 30 alan
  const first30 = Object.entries(rd).slice(0, 30).map(([k,v]) => `${k}=${v}`).join(", ");
  console.log("İlk 30:", first30);
  console.log("---");
}
