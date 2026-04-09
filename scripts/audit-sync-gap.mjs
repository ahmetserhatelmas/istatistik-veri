/**
 * Gün bazında: MacIdListesi (API) ile Supabase matches.tarih karşılaştırması.
 *
 * Kullanım (proje kökünden):
 *   node --env-file=.env scripts/audit-sync-gap.mjs 2024-01-01 2024-01-31
 *   node --env-file=.env scripts/audit-sync-gap.mjs 2024-01-01 2024-12-31 --json > rapor.jsonl
 *
 * --json  : Her günü tek satır JSON (makine okumalı)
 * --sleep : İstekler arası ms (varsayılan 120)
 * --diff  : gap > 0 olan günlerde eksik maç ID'lerini yaz (API'de var, DB'de yok)
 * --diff-file <yol> : eksik ID'leri satır başına "gün,id" olarak dosyaya ekle
 * --diff-max <n>    : günlük en fazla kaç eksik ID konsola yazılsın (varsayılan 30)
 */

import { createClient } from "@supabase/supabase-js";
import { appendFileSync, writeFileSync } from "fs";

const BASE_URL = process.env.ORAN_BASE_URL || "https://www.oranmerkezi.com";
const BOOKMAKER = process.env.AUDIT_BOOKMAKER || "0";
const SPORT = process.env.AUDIT_SPORT || "FUTBOL";
/** API cevabı bu uzunluğa yakınsa muhtemelen üst limit kesiyor (tahmini) */
const LIMIT_WARNING = Number(process.env.AUDIT_LIMIT_WARNING || "270");

function authPayload() {
  const k = process.env.ORAN_KULLANICI;
  const s = process.env.ORAN_SIFRE;
  const p = process.env.ORAN_PAROLA;
  if (!k || !s || !p) {
    console.error("Eksik env: ORAN_KULLANICI, ORAN_SIFRE, ORAN_PAROLA");
    process.exit(1);
  }
  return { KULLANICI: k, SIFRE: s, PAROLA: p };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Eksik env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

async function getMatchIdsForDay(day) {
  const raw = await apiPost("MacIdListesi", {
    BOOKMAKER,
    SPORTURU: SPORT,
    "TARIH[0]": day,
    "TARIH[1]": day,
  });
  if (!Array.isArray(raw)) {
    return { rawLen: 0, unique: 0, dupInResponse: 0, ids: [], err: String(raw) };
  }
  const nums = raw.map(Number).filter((n) => Number.isFinite(n));
  const set = new Set(nums);
  return {
    rawLen: nums.length,
    unique: set.size,
    dupInResponse: nums.length - set.size,
    ids: [...set],
    err: null,
  };
}

async function dbCountForDay(day) {
  const { count, error } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tarih", day)
    .eq("bookmaker_id", Number(BOOKMAKER));
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function dbIdsForDay(day) {
  const set = new Set();
  let from = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from("matches")
      .select("id")
      .eq("tarih", day)
      .eq("bookmaker_id", Number(BOOKMAKER))
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const r of data) set.add(r.id);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return set;
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

function parseArgs() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const diff = argv.includes("--diff");
  let sleepMs = 120;
  let diffMax = 30;
  let diffFile = null;
  const rest = argv.filter((a) => !["--json", "--diff"].includes(a));
  const sleepIdx = rest.indexOf("--sleep");
  if (sleepIdx >= 0 && rest[sleepIdx + 1]) {
    sleepMs = Math.max(0, Number(rest[sleepIdx + 1]) || 120);
    rest.splice(sleepIdx, 2);
  }
  const dfIdx = rest.indexOf("--diff-file");
  if (dfIdx >= 0 && rest[dfIdx + 1]) {
    diffFile = rest[dfIdx + 1];
    rest.splice(dfIdx, 2);
  }
  const dmIdx = rest.indexOf("--diff-max");
  if (dmIdx >= 0 && rest[dmIdx + 1]) {
    diffMax = Math.max(1, Number(rest[dmIdx + 1]) || 30);
    rest.splice(dmIdx, 2);
  }
  const pos = rest.filter((a) => !a.startsWith("--"));
  const dateFrom = pos[0];
  const dateTo = pos[1] || pos[0];
  if (!dateFrom) {
    console.error(
      "Kullanım: node --env-file=.env scripts/audit-sync-gap.mjs <dateFrom> [dateTo] [--json] [--sleep 120] [--diff] [--diff-file eksik.txt] [--diff-max 50]"
    );
    process.exit(1);
  }
  return { dateFrom, dateTo, json, sleepMs, diff, diffFile, diffMax };
}

async function main() {
  const { dateFrom, dateTo, json, sleepMs, diff, diffFile, diffMax } =
    parseArgs();
  const days = eachDay(dateFrom, dateTo);

  if (diffFile) {
    writeFileSync(diffFile, "# gün,maç_id (API'de var, DB'de yok)\n", "utf8");
  }

  const summary = {
    days: days.length,
    apiUniqueTotal: 0,
    dbTotal: 0,
    gapTotal: 0,
    limitSuspectDays: 0,
    dupInApiTotal: 0,
    daysWithGap: 0,
    daysWithApiError: 0,
    missingIdsTotal: 0,
  };

  if (!json) {
    console.log(
      `\nDenetim: ${dateFrom} → ${dateTo} | bookmaker=${BOOKMAKER} sport=${SPORT}\n`
    );
    console.log(
      "gün        | API(raw) | API(uniq) | dup | DB   | eksik | limit?"
    );
    console.log("-".repeat(72));
  }

  for (const day of days) {
    let api;
    try {
      api = await getMatchIdsForDay(day);
    } catch (e) {
      summary.daysWithApiError++;
      if (json) {
        console.log(
          JSON.stringify({
            day,
            error: e instanceof Error ? e.message : String(e),
          })
        );
      } else {
        console.log(`${day} | API HATA: ${e instanceof Error ? e.message : e}`);
      }
      await sleep(sleepMs);
      continue;
    }

    let db = 0;
    try {
      db = await dbCountForDay(day);
    } catch (e) {
      if (json) {
        console.log(
          JSON.stringify({
            day,
            api_raw: api.rawLen,
            api_unique: api.unique,
            db_error: e instanceof Error ? e.message : String(e),
          })
        );
      } else {
        console.log(`${day} | DB HATA: ${e}`);
      }
      await sleep(sleepMs);
      continue;
    }

    const gap = api.unique - db;
    const limitSuspect = api.rawLen >= LIMIT_WARNING;

    let missingIds = [];
    if (diff && gap > 0 && api.ids.length > 0) {
      const dbSet = await dbIdsForDay(day);
      missingIds = api.ids.filter((id) => !dbSet.has(id));
      summary.missingIdsTotal += missingIds.length;
      if (missingIds.length !== gap) {
        console.warn(
          `  ⚠ ${day}: gap=${gap} ama eksik ID sayımı=${missingIds.length} (tarih uyumsuzluğu olabilir)`
        );
      }
      if (diffFile && missingIds.length > 0) {
        const lines = missingIds.map((id) => `${day},${id}\n`).join("");
        appendFileSync(diffFile, lines, "utf8");
      }
    }

    summary.apiUniqueTotal += api.unique;
    summary.dbTotal += db;
    summary.gapTotal += gap;
    summary.dupInApiTotal += api.dupInResponse;
    if (limitSuspect) summary.limitSuspectDays++;
    if (gap !== 0) summary.daysWithGap++;

    if (json) {
      const row = {
        day,
        api_raw: api.rawLen,
        api_unique: api.unique,
        dup_in_response: api.dupInResponse,
        db_count: db,
        gap,
        limit_suspect: limitSuspect,
      };
      if (diff && gap > 0) row.missing_count = missingIds.length;
      console.log(JSON.stringify(row));
    } else if (gap !== 0 || limitSuspect || api.dupInResponse > 0) {
      console.log(
        `${day} | ${String(api.rawLen).padStart(8)} | ${String(api.unique).padStart(9)} | ${String(api.dupInResponse).padStart(3)} | ${String(db).padStart(4)} | ${String(gap).padStart(5)} | ${limitSuspect ? "EVET" : ""}`
      );
      if (diff && missingIds.length > 0) {
        const show = missingIds.slice(0, diffMax);
        console.log(
          `     → eksik ${missingIds.length} id (ilk ${show.length}): ${show.join(", ")}`
        );
      }
    }

    await sleep(sleepMs);
  }

  if (!json) {
    console.log("-".repeat(72));
    console.log("ÖZET");
    console.log(`  Gün sayısı:           ${summary.days}`);
    console.log(`  API benzersiz (toplam): ${summary.apiUniqueTotal.toLocaleString("tr-TR")}`);
    console.log(`  DB satır (toplam):      ${summary.dbTotal.toLocaleString("tr-TR")}`);
    console.log(
      `  Toplam gap (uniq-DB):   ${summary.gapTotal.toLocaleString("tr-TR")}`
    );
    console.log(`  API yanıtında dup:      ${summary.dupInApiTotal.toLocaleString("tr-TR")}`);
    console.log(
      `  Limit şüphesi günleri (>=${LIMIT_WARNING} raw): ${summary.limitSuspectDays}`
    );
    console.log(`  Gap olan gün:           ${summary.daysWithGap}`);
    console.log(`  API hata günü:          ${summary.daysWithApiError}`);
    if (diff) {
      console.log(
        `  Eksik ID (diff toplamı): ${summary.missingIdsTotal.toLocaleString("tr-TR")}`
      );
      if (diffFile) console.log(`  Eksik listesi dosyası:   ${diffFile}`);
    }
    console.log(`
Yorum:
  • "limit?" EVET → O gün API tek istekte ~${LIMIT_WARNING}+ ID döndü; kesilmiş olabilir, o günü daha küçük parçalara bölmek gerekir.
  • gap > 0     → API'de olan benzersiz ID sayısı DB'den fazla (detay çekilememiş veya upsert hatası olabilir).
  • gap < 0     → DB'de o tarihte fazla satır var (aynı gün farklı kaynak / tarih alanı farkı).
`);
  } else {
    console.log(
      JSON.stringify({
        type: "summary",
        ...summary,
        limit_warning_threshold: LIMIT_WARNING,
      })
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
