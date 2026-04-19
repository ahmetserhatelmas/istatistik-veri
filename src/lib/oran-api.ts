const BASE_URL = process.env.ORAN_BASE_URL || "https://www.oranmerkezi.com";

function authPayload() {
  return {
    KULLANICI: process.env.ORAN_KULLANICI!,
    SIFRE: process.env.ORAN_SIFRE!,
    PAROLA: process.env.ORAN_PAROLA!,
  };
}

/** Harici Oran API; bazen yavaş / zaman aşımı — Node varsayılanı uzun bekleyebilir. */
const ORAN_FETCH_TIMEOUT_MS = 20_000;

async function apiPost(func: string, extra: Record<string, string> = {}) {
  const body = new URLSearchParams({ ...authPayload(), ...extra });
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ORAN_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/index.php/DataAPI/${func}.html`, {
      method: "POST",
      signal: ac.signal,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: body.toString(),
    });
    return res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function getBalance(): Promise<number> {
  const r = await apiPost("BakiyeSorgula");
  return r?.GUNCELHESAPBAKIYESI ?? 0;
}

export async function getMatchIds(
  dateFrom: string,
  dateTo: string,
  bookmaker = "0",
  sport = "FUTBOL"
): Promise<number[]> {
  const params: Record<string, string> = {
    BOOKMAKER: bookmaker,
    SPORTURU: sport,
    "TARIH[0]": dateFrom,
    "TARIH[1]": dateTo,
  };
  const raw = await apiPost("MacIdListesi", params);
  if (Array.isArray(raw)) return raw.map(Number);
  return [];
}

function suffixOf(code: string | number, n: number): string {
  const s = String(code);
  return s.length >= n ? s.slice(-n) : s;
}

interface MatchRow {
  id: number;
  tarih: string;
  saat: string | null;
  tarih_tr_gunlu: string | null;
  lig_kodu: string | null;
  lig_adi: string | null;
  lig_id: number | null;
  alt_lig_adi: string | null;
  alt_lig_id: number | null;
  sezon_adi: string | null;
  sezon_id: number | null;
  t1: string | null;
  t2: string | null;
  t1i: number | null;
  t2i: number | null;
  hakem: string | null;
  t1_antrenor: string | null;
  t2_antrenor: string | null;
  sonuc_iy: string | null;
  sonuc_ms: string | null;
  ft1: number | null;
  ft2: number | null;
  ht1: number | null;
  ht2: number | null;
  ms1: string | null;
  msx: string | null;
  ms2: string | null;
  iy1: string | null;
  iyx: string | null;
  iy2: string | null;
  a: string | null;
  u: string | null;
  kg_var: string | null;
  kg_yok: string | null;
  kod_ms: number | null;
  kod_cs: number | null;
  kod_iy: number | null;
  kod_au: number | null;
  mac_suffix4: string;
  mac_suffix3: string;
  mac_suffix2: string;
  sport_turu: string;
  bookmaker_id: number;
  raw_data: Record<string, unknown>;
}

function parseMatch(obj: Record<string, unknown>, bookmaker: number, sport: string): MatchRow {
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
    sport_turu: sport,
    bookmaker_id: bookmaker,
    raw_data: obj as Record<string, unknown>,
  };
}

export async function getMatchDetails(
  ids: number[],
  bookmaker = "0",
  sport = "FUTBOL"
): Promise<MatchRow[]> {
  const params: Record<string, string> = {
    BOOKMAKER: bookmaker,
    SPORTURU: sport,
    ORANTURU: "SONGUNCEL",
    ORANFORMATI: "%0.2f",
    BAKIYEDENDUS: "1",
  };
  ids.forEach((mid, i) => {
    params[`MACIDLISTESI[${i}]`] = String(mid);
  });
  const raw = await apiPost("iDdenMacDatasi", params);
  const rows: MatchRow[] = [];
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) {
      if (/^\d+$/.test(k) && typeof v === "object" && v !== null) {
        rows.push(parseMatch(v as Record<string, unknown>, Number(bookmaker), sport));
      }
    }
  }
  return rows;
}
