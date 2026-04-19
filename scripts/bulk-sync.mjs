import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.ORAN_BASE_URL || "https://www.oranmerkezi.com";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://bfvsochsnzomypnecrla.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdnNvY2hzbnpvbXlwbmVjcmxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQxMTg0MiwiZXhwIjoyMDkwOTg3ODQyfQ.f0W_eWFu-VdKHJcpVhxL10N0ixhyjGd2t7wHZWm-1fo"
);

const BATCH_SIZE = 25;
const BOOKMAKER = "0";
const SPORT = "FUTBOL";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function authPayload() {
  return {
    KULLANICI: process.env.ORAN_KULLANICI || "dogru.goksel@gmail.com",
    SIFRE: process.env.ORAN_SIFRE || "SuUtmQaszYnbBvXy",
    PAROLA: process.env.ORAN_PAROLA || "AqbTyLKYpPRWbbcV",
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

async function getBalance() {
  const r = await apiPost("BakiyeSorgula");
  return Number(r?.GUNCELHESAPBAKIYESI ?? 0);
}

async function getMatchIds(date) {
  const raw = await apiPost("MacIdListesi", {
    BOOKMAKER: BOOKMAKER,
    SPORTURU: SPORT,
    "TARIH[0]": date,
    "TARIH[1]": date,
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
  };
}

async function getMatchDetails(ids) {
  const params = {
    BOOKMAKER: BOOKMAKER,
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

async function getMatchIdsRange(from, to) {
  const raw = await apiPost("MacIdListesi", {
    BOOKMAKER: BOOKMAKER,
    SPORTURU: SPORT,
    "TARIH[0]": from,
    "TARIH[1]": to,
  });
  if (Array.isArray(raw)) return raw.map(Number);
  return [];
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
    if (error) throw new Error(`Supabase existing check: ${error.message}`);
    for (const r of data || []) existingSet.add(r.id);
  }
  return existingSet;
}

async function fetchAndInsert(ids, label) {
  const existingSet = await existingIdsSet(ids);
  const newIds = ids.filter((id) => !existingSet.has(id));

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
              `Bakiye 0 — iDdenMacDatasi boş (${label}). Hesabı yükleyip script'i yeniden çalıştırın.`
            );
          }
          console.log(
            `  ⚠ ${label}: detay boş ama bakiye ${bal}; ID'ler geçersiz olabilir, atlanıyor`
          );
          break;
        }
        if (rows.length > 0 && rows.length < chunk.length) {
          console.log(
            `  ⚠ ${label}: istenen ${chunk.length} maçtan ${rows.length} satır geldi`
          );
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
  return { total: ids.length, inserted, skipped: ids.length - newIds.length };
}

async function main() {
  const dateFrom = process.argv[2] || "2019-01-01";
  const dateTo = process.argv[3] || new Date().toISOString().slice(0, 10);

  const DAILY_CUTOFF = "2020-01-01";

  const chunks = [];

  if (dateFrom < DAILY_CUTOFF) {
    const weekEnd = dateTo < DAILY_CUTOFF ? dateTo : "2019-12-31";
    const weeks = eachWeek(dateFrom, weekEnd);
    for (const [wFrom, wTo] of weeks) {
      chunks.push({ type: "week", from: wFrom, to: wTo, label: `${wFrom}~${wTo}` });
    }
  }

  const dailyStart = dateFrom >= DAILY_CUTOFF ? dateFrom : DAILY_CUTOFF;
  if (dailyStart <= dateTo) {
    const days = eachDay(dailyStart, dateTo);
    for (const day of days) {
      chunks.push({ type: "day", from: day, to: day, label: day });
    }
  }

  console.log(`\n========================================`);
  console.log(`  BULK SYNC: ${dateFrom} → ${dateTo}`);
  console.log(`  2019: ${chunks.filter(c => c.type === "week").length} haftalık sorgu`);
  console.log(`  2020+: ${chunks.filter(c => c.type === "day").length} günlük sorgu`);
  console.log(`  Toplam sorgu: ${chunks.length}`);
  console.log(`========================================\n`);

  const startBal = await getBalance();
  console.log(`API bakiye (başlangıç): ${startBal.toLocaleString("tr-TR")}`);
  if (startBal <= 0) {
    console.error(
      "\nHATA: Bakiye 0. MacIdListesi çalışır ama iDdenMacDatasi (detay) yazmaz.\n" +
        "Hesabı yükle, sonra bu script'i tekrar çalıştır (eksik tarih aralığıyla).\n"
    );
    process.exit(1);
  }

  console.log(
    "Kredi: MacIdListesi (ID listesi) genelde düşmez; iDdenMacDatasi (maç detayı) maç başı düşer.\n" +
      "Uzun süre satır gelmezse: o günler zaten DB'de olabilir (atlanıyor). Aşağıda ara sıra ilerleme satırı görünür.\n"
  );

  let grandTotal = 0;
  let grandInserted = 0;
  let grandSkipped = 0;
  let chunksDone = 0;
  const startTime = Date.now();

  for (const chunk of chunks) {
    try {
      const ids = chunk.type === "week"
        ? await getMatchIdsRange(chunk.from, chunk.to)
        : await getMatchIds(chunk.from);

      if (ids.length === 0) {
        chunksDone++;
        if (chunksDone % 100 === 0) {
          const pct = ((chunksDone / chunks.length) * 100).toFixed(1);
          console.log(`... ${chunk.label} | %${pct} | ${grandInserted.toLocaleString("tr-TR")} toplam`);
        }
        continue;
      }

      const result = await fetchAndInsert(ids, chunk.label);
      grandTotal += result.total;
      grandInserted += result.inserted;
      grandSkipped += result.skipped;
      chunksDone++;

      if (result.inserted > 0) {
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        const pct = ((chunksDone / chunks.length) * 100).toFixed(1);
        const rate = grandInserted / ((Date.now() - startTime) / 1000 / 60);
        const remaining = rate > 0
          ? ((chunks.length - chunksDone) / (chunksDone / ((Date.now() - startTime) / 1000 / 60))).toFixed(0)
          : "?";
        console.log(
          `${chunk.label} | +${result.inserted} yeni (${result.skipped} mevcut) | ` +
          `Toplam: ${grandInserted.toLocaleString("tr-TR")} | ` +
          `%${pct} | ${elapsed}dk | ~${remaining}dk kaldı | ` +
          `${rate.toFixed(0)} maç/dk`
        );
      } else {
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        const pct = ((chunksDone / chunks.length) * 100).toFixed(1);
        if (
          chunksDone === 1 ||
          chunksDone % 15 === 0 ||
          chunksDone === chunks.length
        ) {
          console.log(
            `... ${chunk.label} | %${pct} | atlandı (yeni 0, bu günde ${result.skipped} zaten DB'de) | ${elapsed}dk`
          );
        }
      }
    } catch (err) {
      console.error(`✗ ${chunk.label}: ${err.message}`);
      await sleep(2000);
      chunksDone++;
    }
  }

  const totalMinutes = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n========================================`);
  console.log(`  TAMAMLANDI`);
  console.log(`  Süre: ${totalMinutes} dakika`);
  console.log(`  İşlenen sorgu: ${chunksDone}`);
  console.log(`  Toplam ID: ${grandTotal.toLocaleString("tr-TR")}`);
  console.log(`  Yeni eklenen: ${grandInserted.toLocaleString("tr-TR")}`);
  console.log(`  Zaten mevcut: ${grandSkipped.toLocaleString("tr-TR")}`);
  console.log(`========================================\n`);
}

main().catch(console.error);
