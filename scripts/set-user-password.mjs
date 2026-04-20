/**
 * Supabase kullanıcısına e-posta GÖNDERMEDEN şifre atar (Admin API).
 *
 * Gerekli ortam (.env veya .env.local, proje kökünde):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (Dashboard → Settings → API; asla git'e koymayın)
 *
 * Şifreyi kabukta bırakmamak için yalnızca ortam değişkeninden okunur:
 *   SUPABASE_NEW_PASSWORD
 *
 * Kullanım (e-posta veya kullanıcı UUID — JSON’daki id):
 *   SUPABASE_NEW_PASSWORD='güçlü-bir-şifre' node scripts/set-user-password.mjs ahmetserhatelmas@gmail.com
 *   SUPABASE_NEW_PASSWORD='güçlü-bir-şifre' node scripts/set-user-password.mjs 5160e643-06be-4897-9ed9-a3a38dfc8da4
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

function loadDotEnvFile(rel) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const envPath = resolve(root, rel);
  if (!existsSync(envPath)) return false;
  let text = readFileSync(envPath, "utf8");
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
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
  return true;
}

loadDotEnvFile(".env.local");
loadDotEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const newPassword = process.env.SUPABASE_NEW_PASSWORD;
const arg = process.argv[2]?.trim();

if (!arg) {
  console.error(
    "Kullanım: SUPABASE_NEW_PASSWORD='…' node scripts/set-user-password.mjs <e-posta|kullanıcı-uuid>",
  );
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error("Eksik: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY (.env / .env.local).");
  process.exit(1);
}
if (!newPassword || newPassword.length < 6) {
  console.error("Eksik veya çok kısa: ortam değişkeni SUPABASE_NEW_PASSWORD (en az 6 karakter).");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userId = arg;
if (arg.includes("@")) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error("listUsers:", error.message);
    process.exit(1);
  }
  const u = data.users.find((x) => (x.email ?? "").toLowerCase() === arg.toLowerCase());
  if (!u) {
    console.error(`Bu e-postayla kullanıcı bulunamadı: ${arg}`);
    process.exit(1);
  }
  userId = u.id;
}

const { data: updated, error: upErr } = await supabase.auth.admin.updateUserById(userId, {
  password: newPassword,
});

if (upErr) {
  console.error("updateUserById:", upErr.message);
  process.exit(1);
}

console.log("Tamam. Şifre güncellendi:", updated.user?.email ?? userId);
console.log("Yerelde: Giriş → aynı e-posta → Şifre ile gir.");
