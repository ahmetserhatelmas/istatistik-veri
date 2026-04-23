/**
 * Supabase Auth’ta kullanıcı oluşturur (e-posta onaylı) ve user_access’te admin onayı verir.
 *
 * Gerekli: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env / .env.local)
 *
 * Tek kullanıcı:
 *   BOOTSTRAP_EMAIL=a@b.com BOOTSTRAP_PASSWORD='…' npm run bootstrap:approved-user
 *
 * Çoklu (aynı şifre, virgül veya satır sonu ile):
 *   BOOTSTRAP_EMAILS='a@b.com,c@d.com' BOOTSTRAP_PASSWORD='…' npm run bootstrap:approved-user
 *
 * Kullanıcı zaten varsa: şifre güncellenir ve onay tekrar verilir.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "ahmetserhatelmas@gmail.com";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const password = String(process.env.BOOTSTRAP_PASSWORD ?? "");

function parseBootstrapEmails() {
  const multi = String(process.env.BOOTSTRAP_EMAILS ?? "").trim();
  if (multi) {
    return multi
      .split(/[\n,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  const one = String(process.env.BOOTSTRAP_EMAIL ?? "").trim().toLowerCase();
  return one ? [one] : [];
}

const emails = parseBootstrapEmails();

if (!url || !serviceKey) {
  console.error("Eksik: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!emails.length) {
  console.error("Geçersiz veya boş: BOOTSTRAP_EMAIL veya BOOTSTRAP_EMAILS");
  process.exit(1);
}
for (const email of emails) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Geçersiz e-posta:", email);
    process.exit(1);
  }
}
if (password.length < 8) {
  console.error("BOOTSTRAP_PASSWORD en az 8 karakter olmalı");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserIdByEmail(target) {
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const u = data.users.find((x) => (x.email ?? "").toLowerCase() === target);
    if (u) return u.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function bootstrapOne(email) {
  let userId;

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: email.split("@")[0] ?? email },
  });

  if (createErr) {
    if (/already registered|already exists|duplicate/i.test(createErr.message)) {
      const existing = await findUserIdByEmail(email);
      if (!existing) {
        throw new Error(`Kullanıcı var ama id bulunamadı: ${createErr.message}`);
      }
      userId = existing;
      const { error: pwdErr } = await supabase.auth.admin.updateUserById(userId, { password });
      if (pwdErr) throw new Error(`Şifre güncellenemedi (${email}): ${pwdErr.message}`);
      console.log("Mevcut kullanıcı; şifre güncellendi:", email);
    } else {
      throw new Error(`createUser (${email}): ${createErr.message}`);
    }
  } else {
    if (!created.user?.id) {
      throw new Error("Kullanıcı id dönmedi");
    }
    userId = created.user.id;
    console.log("Yeni kullanıcı oluşturuldu:", email);
  }

  const now = new Date().toISOString();
  const { error: upErr } = await supabase.from("user_access").upsert(
    {
      user_id: userId,
      email,
      is_approved: true,
      approved_at: now,
      approved_by_email: ADMIN_EMAIL,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (upErr) {
    throw new Error(`user_access (${email}): ${upErr.message}`);
  }

  console.log("Onay tamam. user_id:", userId, "|", email);
}

let failed = 0;
for (const email of emails) {
  try {
    await bootstrapOne(email);
  } catch (e) {
    console.error(e?.message ?? e);
    failed += 1;
  }
}

if (failed) process.exit(1);
