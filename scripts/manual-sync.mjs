/**
 * Planlı Vercel Cron kullanmadan production senkronu tetikler.
 * GET /api/cron/sync + Authorization: Bearer CRON_SECRET
 *
 * .env bu script içinde okunur (Node sürümünün --env-file desteği gerekmez).
 *
 * Gerekli (birisi yeter):
 *   URL: APP_URL | NEXT_PUBLIC_APP_URL | SITE_URL | DEPLOY_URL | ORIGIN | VERCEL_URL
 *   Gizli: CRON_SECRET
 *
 * Kullanım: npm run sync:now
 * Yerel Next: APP_URL=http://localhost:3000 npm run sync:now
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function loadDotEnv() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return { path: envPath, loaded: false };
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
  return { path: envPath, loaded: true };
}

const { path: envPath, loaded: envLoaded } = loadDotEnv();

const baseRaw =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.SITE_URL ||
  process.env.DEPLOY_URL ||
  process.env.ORIGIN ||
  process.env.VERCEL_URL;

const secret = process.env.CRON_SECRET;

if (!baseRaw || !secret) {
  console.error(
    "Eksik ortam: deployment URL (APP_URL, NEXT_PUBLIC_APP_URL, SITE_URL, …) ve CRON_SECRET gerekli."
  );
  console.error(
    envLoaded
      ? `.env okundu: ${envPath}`
      : `.env bulunamadı veya okunamadı: ${envPath}`
  );
  process.exit(1);
}

const base = baseRaw.startsWith("http") ? baseRaw : `https://${baseRaw}`;
const target = new URL("/api/cron/sync", base.replace(/\/$/, ""));

const res = await fetch(target, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${secret}`,
    Accept: "application/json",
  },
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = text;
}

console.log(typeof body === "string" ? body : JSON.stringify(body, null, 2));
process.exit(res.ok ? 0 : 1);
