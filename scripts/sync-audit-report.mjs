/**
 * Audit tablosu (audit-sync-gap benzeri) + eksik maçları çek (bulk-sync) + bakiye gösterimi.
 *
 *   node --env-file=.env scripts/sync-audit-report.mjs 2019-08-27 2026-04-09
 *   node --env-file=.env scripts/sync-audit-report.mjs 2025-01-01 2025-01-31 --dry-run
 *
 * --dry-run     Sadece tablo + bakiye; veri çekmez (kredi: sadece liste + bakiye sorguları)
 * --balance-every N   Her N parçada bir bakiye sorgula (varsayılan 1)
 */

import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.ORAN_BASE_URL || "https://www.oranmerkezi.com";
const BATCH_SIZE = 25;
const BOOKMAKER = "0";
const SPORT = "FUTBOL";
const LIMIT_WARNING = Number(process.env.AUDIT_LIMIT_WARNING || "270");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

async function getBalance() {
  const r = await apiPost("BakiyeSorgula");
  return Number(r?.GUNCELHESAPBAKIYESI ?? 0);
}

async function getMatchIds(date) {
  const raw = await apiPost("MacIdListesi", {
    BOOKMAKER,
    SPORTURU: SPORT,
    "TARIH[0]": date,
    "TARIH[1]": date,
  });
  if (Array.isArray(raw)) return raw.map(Number);
  return [];
}

async function getMatchIdsRange(from, to) {
  const raw = await apiPost("MacIdListesi", {
    BOOKMAKER,
    SPORTURU: SPORT,
    "TARIH[0]": from,
    "TARIH[1]": to,
  });
  if (Array.isArray(raw)) return raw.map(Number);
  return [];
}

function analyzeIds(nums) {
  const clean = nums.filter((n) => Number.isFinite(n));
  const set = new Set(clean);
  return {
    rawLen: clean.length,
    uniq: set.size,
    dup: clean.length - set.size,
    uniqueList: [...set],
  };
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

async function dbCountInRange(from, to) {
  const { count, error } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .gte("tarih", from)
    .lte("tarih", to)
    .eq("bookmaker_id", Number(BOOKMAKER));
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function existingIdsSet(ids) {
  const existingSet = new Set();
  const IN_CHUNK = 200;
  for (let j = 0; j < ids.length; j += IN_CHUNK) {
    const slice = ids.slice(j, j + IN_CHUNK);
    const { data, error } = await supabase
      .from("matches")
      .select("id")
      .in("id", slice);
    if (error) throw new Error(error.message);
    for (const r of data || []) existingSet.add(r.id);
  }
  return existingSet;
}

/** newIds: DB'de olmayan maç ID listesi (önceden hesaplanmış) */
async function fetchAndInsertNewIds(newIds, label) {
  let inserted = 0;
  for (let i = 0; i < newIds.length; i += BATCH_SIZE) {
    const chunk = newIds.slice(i, i + BATCH_SIZE);
    let retries = 3;
    while (retries > 0) {
      try {
        const rows = await getMatchDetails(chunk);
        if (chunk.length > 0 && rows.length === 0) {
          const bal = await getBalance();
          if (bal <= 0) {
            throw new Error(
              `Bakiye 0 — iDdenMacDatasi boş (${label}). Hesabı yükleyip devam edin.`
            );
          }
          console.log(
            `  ⚠ ${label}: detay boş, bakiye=${bal}; atlanıyor`
          );
          break;
        }
        if (rows.length > 0) {
          const { error } = await supabase
            .from("matches")
            .upsert(rows, { onConflict: "id" });
          if (error) throw error;
          inserted += rows.length;
        }
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        console.log(`  ⚠ Retry (${3 - retries}/3) ${label}: ${err.message}`);
        await sleep(2000);
      }
    }
    await sleep(150);
  }
  return { inserted };
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

function eachWeek(from, to) {
  const weeks = [];
  const cur = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (cur <= end) {
    const weekEnd = new Date(cur);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const actualEnd = weekEnd > end ? end : weekEnd;
    weeks.push([cur.toISOString().slice(0, 10), actualEnd.toISOString().slice(0, 10)]);
    cur.setUTCDate(cur.getUTCDate() + 7);
  }
  return weeks;
}

function buildChunks(dateFrom, dateTo) {
  const DAILY_CUTOFF = "2020-01-01";
  const chunks = [];
  if (dateFrom < DAILY_CUTOFF) {
    const weekEnd = dateTo < DAILY_CUTOFF ? dateTo : "2019-12-31";
    for (const [wFrom, wTo] of eachWeek(dateFrom, weekEnd)) {
      chunks.push({ type: "week", from: wFrom, to: wTo, label: `${wFrom}~${wTo}` });
    }
  }
  const dailyStart = dateFrom >= DAILY_CUTOFF ? dateFrom : DAILY_CUTOFF;
  if (dailyStart <= dateTo) {
    for (const day of eachDay(dailyStart, dateTo)) {
      chunks.push({ type: "day", from: day, to: day, label: day });
    }
  }
  return chunks;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  let balanceEvery = 1;
  const rest = argv.filter((a) => a !== "--dry-run");
  const beIdx = rest.indexOf("--balance-every");
  if (beIdx >= 0 && rest[beIdx + 1]) {
    balanceEvery = Math.max(1, Number(rest[beIdx + 1]) || 1);
    rest.splice(beIdx, 2);
  }
  const pos = rest.filter((a) => !a.startsWith("--"));
  const dateFrom = pos[0];
  const dateTo = pos[1] || pos[0];
  if (!dateFrom) {
    console.error(
      "Kullanım: node --env-file=.env scripts/sync-audit-report.mjs <dateFrom> [dateTo] [--dry-run] [--balance-every 3]"
    );
    process.exit(1);
  }
  return { dateFrom, dateTo, dryRun, balanceEvery };
}

async function main() {
  const { dateFrom, dateTo, dryRun, balanceEvery } = parseArgs();
  const chunks = buildChunks(dateFrom, dateTo);

  console.log(
    `\nDenetim + sync: ${dateFrom} → ${dateTo} | bookmaker=${BOOKMAKER} ${SPORT}` +
      (dryRun ? " | DRY-RUN (çekim yok)" : "") +
      `\n`
  );
  console.log(
    "gün / aralık      | API(raw) | API(uniq) | dup | DB   | yeni | lim? |"
  );
  console.log(
    "(DB = o aralıktaki satır sayısı; yeni = API'nin verdiği ID'lerden DB'de olmayan → çekilecek)"
  );
  console.log("-".repeat(88));

  let bal = await getBalance();
  console.log(`Başlangıç bakiye: ${bal.toLocaleString("tr-TR")}\n`);

  if (!dryRun && bal <= 0) {
    console.error("Bakiye 0 — çekim yapılamaz. --dry-run ile sadece rapor alın.");
    process.exit(1);
  }

  let sumApiUniq = 0;
  let sumDb = 0;
  let sumInserted = 0;
  let chunksDone = 0;

  for (const ch of chunks) {
    const nums =
      ch.type === "week"
        ? await getMatchIdsRange(ch.from, ch.to)
        : await getMatchIds(ch.from);
    const { rawLen, uniq, dup, uniqueList } = analyzeIds(nums);
    const dbCnt = await dbCountInRange(ch.from, ch.to);
    const limitSuspect = rawLen >= LIMIT_WARNING;

    let newIds = [];
    if (uniqueList.length > 0) {
      const es = await existingIdsSet(uniqueList);
      newIds = uniqueList.filter((id) => !es.has(id));
    }
    const newIdCount = newIds.length;

    sumApiUniq += uniq;
    sumDb += dbCnt;

    const limStr = limitSuspect ? "EVET" : "";
    const labelPad = ch.label.length > 16 ? ch.label.slice(0, 13) + "..." : ch.label.padEnd(16);
    console.log(
      `${labelPad} | ${String(rawLen).padStart(8)} | ${String(uniq).padStart(9)} | ${String(dup).padStart(3)} | ${String(dbCnt).padStart(4)} | ${String(newIdCount).padStart(4)} | ${limStr.padEnd(4)} |`
    );

    let inserted = 0;
    if (!dryRun && newIds.length > 0) {
      const r = await fetchAndInsertNewIds(newIds, ch.label);
      inserted = r.inserted;
      sumInserted += inserted;
    }

    chunksDone++;
    if (chunksDone % balanceEvery === 0 || inserted > 0 || newIdCount > 0) {
      bal = await getBalance();
      let tail;
      if (dryRun) {
        tail = `dry-run çekim yok | çekilecek yeni: ${newIdCount} | bakiye: ${bal.toLocaleString("tr-TR")}`;
      } else {
        tail = `+${inserted} yazıldı (hedef yeni ID: ${newIdCount}) | bakiye: ${bal.toLocaleString("tr-TR")}`;
      }
      console.log(`    → ${tail}`);
    }

    if (uniq === 0 && dbCnt === 0 && !dryRun) {
      /* boş gün */
    }
  }

  console.log("-".repeat(88));
  console.log("ÖZET");
  console.log(`  Parça sayısı:     ${chunks.length}`);
  console.log(
    `  API benzersiz Σ:  ${sumApiUniq.toLocaleString("tr-TR")} (parçalar birbirini dışlıyorsa = aralıktaki toplam benzersiz ID)`
  );
  console.log(
    `  DB satır Σ:       ${sumDb.toLocaleString("tr-TR")} (parçalar birbirini dışlıyorsa ≈ aralıktaki toplam satır)`
  );
  if (!dryRun) {
    console.log(`  Bu koşuda yazılan: ${sumInserted.toLocaleString("tr-TR")}`);
  }
  bal = await getBalance();
  console.log(`  Son bakiye:       ${bal.toLocaleString("tr-TR")}`);
  console.log(`
Kredi: iDdenMacDatasi (yazılan maç) düşer. MacIdListesi + BakiyeSorgula genelde çok az / ücretsiz sayılır.
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
