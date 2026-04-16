"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_COLS,
  CF_CLIENT_ONLY_COL_IDS,
  OKBT_MULTI_SOURCE_MAP,
  DEFAULT_VISIBLE,
  GROUP_COLORS,
  mergeAllCols,
  type ColDef,
} from "@/lib/columns";
import { okbtBasamakHucreDegeri } from "@/lib/okbt-basamak-toplamlari";

type Match = Record<string, unknown>;
interface ApiResponse {
  data?: Match[];
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  error?: string;
  detail?: string;
  code?: string;
}

function formatLastSyncTr(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

// ── wildcard / contains filtre ────────────────────────────────────────────────
function matchWildcard(value: string, pattern: string): boolean {
  const val = value.toLowerCase();
  return pattern.split("+").map((s) => s.trim()).filter(Boolean).some((part) => {
    if (!part.includes("*") && !part.includes("?")) return val.includes(part.toLowerCase());
    const re = part.replace(/[-[\]{}()|^$\\]/g,"\\$&").replace(/\./g,"\\.").replace(/\*/g,".*").replace(/\?/g,".");
    try { return new RegExp(`^${re}$`, "i").test(val); } catch { return val.includes(part.toLowerCase()); }
  });
}

function applyColFilters(rows: Match[], filters: Record<string, string>, cols: ColDef[]): Match[] {
  const active = Object.entries(filters).filter(([, v]) => v.trim());
  if (!active.length) return rows;
  return rows.filter((row) =>
    active.every(([colId, pat]) => {
      const col = cols.find((c) => c.id === colId);
      if (!col) return true;
      const raw = row[col.key];
      const val = raw == null ? "" : col.id === "saat" ? String(raw).slice(0, 5) : String(raw);
      return matchWildcard(val, pat.trim());
    })
  );
}

const GUN_FMT = new Intl.DateTimeFormat("tr-TR", { weekday: "long" });

/** Tabloda gösterim: gün.ay.yıl (ISO YYYY-MM-DD veya DD.MM.YYYY giriş). */
function formatTarihGünAyYıl(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^\d{2}\.\d{2}\.\d{4}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${d}.${mo}.${y}`;
  }
  return s.slice(0, 10);
}

function digitSum(val: unknown): string {
  const s = String(val ?? "").replace(/\D/g, "");
  if (!s) return "";
  return String(s.split("").reduce((acc, d) => acc + Number(d), 0));
}

function cellVal(row: Match, col: ColDef): string {
  // Hesaplanan (computed) sütunlar
  if (col.id === "mbs")     return digitSum(row["id"]);       // MKT = maç kodu basamak toplamı
  if (col.id === "suffix3") return digitSum(row["kod_ms"]);   // MsMKT = MS kodu basamak toplamı
  if (col.id === "suffix4") return digitSum(row["id"]);       // MBS standalone = aynı değer
  // Çok kaynaklı OKBT: {srcId}_obktb_{idx} → client-side hesap (rowKey'den)
  const multiOkbtM = /^([a-z][a-z0-9]*)_obktb_(\d{1,2})$/.exec(col.id);
  if (multiOkbtM) {
    const srcId = multiOkbtM[1]!;
    const idx = Number(multiOkbtM[2]);
    const src = OKBT_MULTI_SOURCE_MAP[srcId];
    if (src && Number.isInteger(idx) && idx >= 0 && idx <= 14) {
      return okbtBasamakHucreDegeri(row[src.rowKey], idx);
    }
    return "";
  }

  const raw = row[col.key] ?? null;
  if (raw == null) return "";
  if (col.id === "saat") return String(raw).slice(0, 5);
  if (col.id === "tarih") return formatTarihGünAyYıl(raw);
  if (col.id === "gun") {
    const tarih = String(row["tarih"] ?? "");
    if (!tarih) return "";
    try {
      let d: Date;
      if (/^\d{2}\.\d{2}\.\d{4}/.test(tarih)) {
        const [day, mon, year] = tarih.split(".");
        d = new Date(`${year}-${mon}-${day}`);
      } else {
        d = new Date(tarih.slice(0, 10));
      }
      return isNaN(d.getTime()) ? "" : GUN_FMT.format(d);
    } catch { return ""; }
  }
  return String(raw);
}

const SCORE_COLS = new Set(["sonuc_iy","sonuc_ms"]);
const ODDS_GROUPS = new Set(["Maç Sonucu","İlk Yarı","Durumlar","KG","Tek/Çift","Top.Gol","Alt/Üst","IY A/Ü","Ev A/Ü","Dep A/Ü","MS A/Ü","Çift Şans","İlk Gol","Daha Çok Gol Y.","IY Skoru"]);

/** Hane pozisyonu → A-Z harfi (tüm sütunlarda tutarlı etiket). */
const DIGIT_POS_LABEL: Record<number, string> = {
  1:"A", 2:"B", 3:"C", 4:"D", 5:"E", 6:"F", 7:"G", 8:"H", 9:"I", 10:"J",
};
const RAW_API_GROUP = "Ham veri (API)";

// ── Hane seçici (digit-position click) ───────────────────────────────────────
/** Kod/oran sütunları: hücreye tıklayınca hangi rakam haneleri filtrelensin? */
const DIGIT_CLICK_COL_IDS = new Set(["id","kod_ms","kod_iy","kod_cs","kod_au"]);

function isDigitClickCol(col: ColDef): boolean {
  return DIGIT_CLICK_COL_IDS.has(col.id) || ODDS_GROUPS.has(col.group) || col.group === RAW_API_GROUP;
}

/**
 * Sütunun tipik değer şablonu: rakamlar '0', ayraçlar olduğu gibi.
 * Widget bunu karaktere göre çizer: rakam → tıklanabilir kutu, diğerleri → ayraç etiketi.
 * Örn. skor sütunu → "0-0", oran → "0.00", kod → "00000"
 */
function digitClickTemplate(col: ColDef): string {
  if (col.id === "id") return "0000000";          // 7 haneli maç kodu
  if (["kod_ms","kod_iy","kod_cs","kod_au"].includes(col.id)) return "00000"; // 5 haneli oyun kodu
  if (col.id === "sonuc_iy" || col.id === "sonuc_ms") return "0-0";           // skor: X-Y
  // Oran grupları: "0.00" (noktalı 3 rakam); Alt/Üst gibi bazıları "0.5" da olabilir
  if (ODDS_GROUPS.has(col.group)) return "0.00";
  return "00000"; // varsayılan
}

/**
 * Seçili hane konumlarına göre wildcard pattern üretir.
 * Val içindeki her karakter sırayla işlenir; rakam ise konumu sayılır.
 * Seçili rakam pozisyonu (1-indexed, soldan) → rakam olduğu gibi kalır.
 * Seçilmemiş rakam → "?" (tek karakter joker).
 * Rakam olmayan karakterler (nokta, tire vb.) olduğu gibi kalır.
 * Örn. "24895" + pos=[2,3] → "?48??"
 * Örn. "2.35"  + pos=[2,3] → "?.35"
 */
function buildDigitPosPattern(val: string, positions: number[]): string {
  if (!positions.length) return val;
  const posSet = new Set(positions);
  let digitIdx = 0;
  let result = "";
  for (const ch of val) {
    if (/\d/.test(ch)) {
      digitIdx++;
      result += posSet.has(digitIdx) ? ch : "?";
    } else {
      result += ch;
    }
  }
  return result;
}

/** Oyun kodu / oran hücreleri — sonek vurgusu (son3–5 hane; kaynak kod seçilebilir). */
const KOD_SUFFIX_SKIP_COLS = new Set([
  "tarih","gun","saat",
  "lig_kodu","lig_adi","lig_id","alt_lig","alt_lig_id","sezon","sezon_id",
  "t1","t1i","t2","t2i",
  "sonuc_iy","sonuc_ms",
  "hakem","t1_antrenor","t2_antrenor",
  "mbs","suffix3","suffix4",
]);

function shouldScanColForKodSuffix(col: ColDef): boolean {
  if (col.id.startsWith("obktb_")) return false;
  if (KOD_SUFFIX_SKIP_COLS.has(col.id)) return false;
  if (ODDS_GROUPS.has(col.group)) return true;
  if (col.id === "id" || col.id === "kod_ms" || col.id === "kod_cs" || col.id === "kod_iy" || col.id === "kod_au") return true;
  if (col.group === RAW_API_GROUP) return true;
  return false;
}

/** Rakamlar üzerinden son N hane eşlemesi (5 haneli oyun kodu veya maç id). */
function cellDigitsEndWith(val: string, suffix: string): boolean {
  const d = val.replace(/\D/g, "");
  return d.length >= suffix.length && d.endsWith(suffix);
}

/** Son N rakam (ör. 3–5); yeterli rakam yoksa null. */
function normalizeKodSuffixDigits(raw: string, n: number): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length < n) return null;
  return d.slice(-n);
}

function rowKodSuffix(row: Match, refKey: string, n: number): string | null {
  return normalizeKodSuffixDigits(String(row[refKey] ?? ""), n);
}

/** Tamamlanmış bir maçta hangi hücre "tuttu" → green (MS bazlı) | orange (IY bazlı) | null */
function computeMatchHit(col: ColDef, row: Match): "green" | "orange" | null {
  // sonuc_ms "2-1" gibi skor formatında geliyor; maç bitmemişse null
  const sonucMs = String(row["sonuc_ms"] ?? "").trim();
  const sonucIy = String(row["sonuc_iy"] ?? "").trim();
  if (!sonucMs) return null; // maç bitmemiş

  const ft1 = row["ft1"] !== null && row["ft1"] !== undefined ? Number(row["ft1"]) : NaN;
  const ft2 = row["ft2"] !== null && row["ft2"] !== undefined ? Number(row["ft2"]) : NaN;
  const ht1 = row["ht1"] !== null && row["ht1"] !== undefined ? Number(row["ht1"]) : NaN;
  const ht2 = row["ht2"] !== null && row["ht2"] !== undefined ? Number(row["ht2"]) : NaN;
  const hasFt = !isNaN(ft1) && !isNaN(ft2);
  const hasHt = !!sonucIy && !isNaN(ht1) && !isNaN(ht2);
  const tg = hasFt ? ft1 + ft2 : NaN;   // toplam gol
  const iyg = hasHt ? ht1 + ht2 : NaN;  // IY toplam gol
  const h2g = hasFt && hasHt ? (ft1 - ht1) + (ft2 - ht2) : NaN; // 2. yarı gol

  // ft1/ft2'den MS sonucunu türet ("1"/"X"/"2")
  const ms = hasFt ? (ft1 > ft2 ? "1" : ft1 === ft2 ? "X" : "2") : "";
  // ht1/ht2'den IY sonucunu türet; yoksa doğrudan "1"/"X"/"2" formatındaysa kullan
  const iy = hasHt
    ? (ht1 > ht2 ? "1" : ht1 === ht2 ? "X" : "2")
    : (["1","X","2"].includes(sonucIy) ? sonucIy : "");

  switch (col.id) {
    // ── Maç Sonucu ─────────────────────────────────────────────────────────────
    case "ms1": return ms === "1" ? "green" : null;
    case "msx": return ms === "X" ? "green" : null;
    case "ms2": return ms === "2" ? "green" : null;

    // ── OKBT (IY sonucu) ───────────────────────────────────────────────────────
    case "iy1": return iy === "1" ? "orange" : null;
    case "iyx": return iy === "X" ? "orange" : null;
    case "iy2": return iy === "2" ? "orange" : null;

    // ── Durumlar (IY/MS kombinasyonu) ──────────────────────────────────────────
    case "iyms11": return iy === "1" && ms === "1" ? "green" : null;
    case "iyms1x": return iy === "1" && ms === "X" ? "green" : null;
    case "iyms12": return iy === "1" && ms === "2" ? "green" : null;
    case "iymsx1": return iy === "X" && ms === "1" ? "green" : null;
    case "iymsxx": return iy === "X" && ms === "X" ? "green" : null;
    case "iymsx2": return iy === "X" && ms === "2" ? "green" : null;
    case "iyms21": return iy === "2" && ms === "1" ? "green" : null;
    case "iyms2x": return iy === "2" && ms === "X" ? "green" : null;
    case "iyms22": return iy === "2" && ms === "2" ? "green" : null;

    // ── KG ────────────────────────────────────────────────────────────────────
    case "kg_var": return hasFt && ft1 > 0 && ft2 > 0 ? "green" : null;
    case "kg_yok": return hasFt && !(ft1 > 0 && ft2 > 0) ? "green" : null;

    // ── Tek/Çift ──────────────────────────────────────────────────────────────
    case "cift": return hasFt && tg % 2 === 0 ? "green" : null;
    case "tek":  return hasFt && tg % 2 !== 0 ? "green" : null;

    // ── Top.Gol ───────────────────────────────────────────────────────────────
    case "tg01": return hasFt && tg <= 1 ? "green" : null;
    case "tg23": return hasFt && tg >= 2 && tg <= 3 ? "green" : null;
    case "tg45": return hasFt && tg >= 4 && tg <= 5 ? "green" : null;
    case "tg6":  return hasFt && tg >= 6 ? "green" : null;

    // ── Alt/Üst (maç) ─────────────────────────────────────────────────────────
    case "a05": return hasFt && tg < 0.5 ? "green" : null;
    case "u05": return hasFt && tg >= 0.5 ? "green" : null;
    case "a15": return hasFt && tg < 1.5 ? "green" : null;
    case "u15": return hasFt && tg >= 1.5 ? "green" : null;
    case "a25": return hasFt && tg < 2.5 ? "green" : null;
    case "u25": return hasFt && tg >= 2.5 ? "green" : null;
    case "a35": return hasFt && tg < 3.5 ? "green" : null;
    case "u35": return hasFt && tg >= 3.5 ? "green" : null;
    case "a45": return hasFt && tg < 4.5 ? "green" : null;
    case "u45": return hasFt && tg >= 4.5 ? "green" : null;
    case "a55": return hasFt && tg < 5.5 ? "green" : null;
    case "u55": return hasFt && tg >= 5.5 ? "green" : null;

    // ── IY Alt/Üst ────────────────────────────────────────────────────────────
    case "iya05": return hasHt && iyg < 0.5 ? "orange" : null;
    case "iyu05": return hasHt && iyg >= 0.5 ? "orange" : null;
    case "iya15": return hasHt && iyg < 1.5 ? "orange" : null;
    case "iyu15": return hasHt && iyg >= 1.5 ? "orange" : null;
    case "iya25": return hasHt && iyg < 2.5 ? "orange" : null;
    case "iyu25": return hasHt && iyg >= 2.5 ? "orange" : null;

    // ── Ev A/Ü ────────────────────────────────────────────────────────────────
    case "eaua05": return hasFt && ft1 < 0.5 ? "green" : null;
    case "eauu05": return hasFt && ft1 >= 0.5 ? "green" : null;
    case "eaua15": return hasFt && ft1 < 1.5 ? "green" : null;
    case "eauu15": return hasFt && ft1 >= 1.5 ? "green" : null;
    case "eaua25": return hasFt && ft1 < 2.5 ? "green" : null;
    case "eauu25": return hasFt && ft1 >= 2.5 ? "green" : null;

    // ── Dep A/Ü ───────────────────────────────────────────────────────────────
    case "daua05": return hasFt && ft2 < 0.5 ? "green" : null;
    case "dauu05": return hasFt && ft2 >= 0.5 ? "green" : null;
    case "daua15": return hasFt && ft2 < 1.5 ? "green" : null;
    case "dauu15": return hasFt && ft2 >= 1.5 ? "green" : null;
    case "daua25": return hasFt && ft2 < 2.5 ? "green" : null;
    case "dauu25": return hasFt && ft2 >= 2.5 ? "green" : null;

    // ── Çift Şans ─────────────────────────────────────────────────────────────
    case "ms_cs1x": return ms === "1" || ms === "X" ? "green" : null;
    case "ms_cs12": return ms === "1" || ms === "2" ? "green" : null;
    case "ms_csx2": return ms === "X" || ms === "2" ? "green" : null;
    case "iy_cs1":  return iy === "1" || iy === "X" ? "orange" : null;
    case "iy_csx":  return iy === "X" || iy === "2" ? "orange" : null;
    case "iy_cs2":  return iy === "1" || iy === "2" ? "orange" : null;

    // ── MS A/Ü ────────────────────────────────────────────────────────────────
    case "msau15_1a": return hasFt && ms === "1" && tg < 1.5 ? "green" : null;
    case "msau15_1u": return hasFt && ms === "1" && tg >= 1.5 ? "green" : null;
    case "msau15_xa": return hasFt && ms === "X" && tg < 1.5 ? "green" : null;
    case "msau15_xu": return hasFt && ms === "X" && tg >= 1.5 ? "green" : null;
    case "msau15_2a": return hasFt && ms === "2" && tg < 1.5 ? "green" : null;
    case "msau15_2u": return hasFt && ms === "2" && tg >= 1.5 ? "green" : null;
    case "msau25_1a": return hasFt && ms === "1" && tg < 2.5 ? "green" : null;
    case "msau25_1u": return hasFt && ms === "1" && tg >= 2.5 ? "green" : null;
    case "msau25_xa": return hasFt && ms === "X" && tg < 2.5 ? "green" : null;
    case "msau25_xu": return hasFt && ms === "X" && tg >= 2.5 ? "green" : null;
    case "msau25_2a": return hasFt && ms === "2" && tg < 2.5 ? "green" : null;
    case "msau25_2u": return hasFt && ms === "2" && tg >= 2.5 ? "green" : null;
    case "msau35_1a": return hasFt && ms === "1" && tg < 3.5 ? "green" : null;
    case "msau35_1u": return hasFt && ms === "1" && tg >= 3.5 ? "green" : null;
    case "msau35_xa": return hasFt && ms === "X" && tg < 3.5 ? "green" : null;
    case "msau35_xu": return hasFt && ms === "X" && tg >= 3.5 ? "green" : null;
    case "msau35_2a": return hasFt && ms === "2" && tg < 3.5 ? "green" : null;
    case "msau35_2u": return hasFt && ms === "2" && tg >= 3.5 ? "green" : null;
    case "msau45_1a": return hasFt && ms === "1" && tg < 4.5 ? "green" : null;
    case "msau45_1u": return hasFt && ms === "1" && tg >= 4.5 ? "green" : null;
    case "msau45_xa": return hasFt && ms === "X" && tg < 4.5 ? "green" : null;
    case "msau45_xu": return hasFt && ms === "X" && tg >= 4.5 ? "green" : null;
    case "msau45_2a": return hasFt && ms === "2" && tg < 4.5 ? "green" : null;
    case "msau45_2u": return hasFt && ms === "2" && tg >= 4.5 ? "green" : null;

    // ── Daha Çok Gol Yarısı ───────────────────────────────────────────────────
    case "ikiys1": return hasFt && hasHt && iyg > h2g ? "orange" : null;
    case "ikiysx": return hasFt && hasHt && iyg === h2g ? "green" : null;
    case "ikiys2": return hasFt && hasHt && h2g > iyg ? "green" : null;

    // ── IY Skoru ──────────────────────────────────────────────────────────────
    case "h1ys_00": return hasHt && ht1 === 0 && ht2 === 0 ? "orange" : null;
    case "h1ys_01": return hasHt && ht1 === 0 && ht2 === 1 ? "orange" : null;
    case "h1ys_10": return hasHt && ht1 === 1 && ht2 === 0 ? "orange" : null;
    case "h1ys_11": return hasHt && ht1 === 1 && ht2 === 1 ? "orange" : null;
    case "h1ys_12": return hasHt && ht1 === 1 && ht2 === 2 ? "orange" : null;
    case "h1ys_20": return hasHt && ht1 === 2 && ht2 === 0 ? "orange" : null;
    case "h1ys_21": return hasHt && ht1 === 2 && ht2 === 1 ? "orange" : null;
    case "h1ys_22": return hasHt && ht1 === 2 && ht2 === 2 ? "orange" : null;
    case "h1ys_dg": {
      if (!hasHt) return null;
      const known = [[0,0],[0,1],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]];
      return !known.some(([h,a]) => ht1 === h && ht2 === a) ? "orange" : null;
    }

    default:
      return null;
  }
}

const HIT_COLORS = [
  "bg-green-500/30 text-green-900",
  "bg-orange-500/30 text-orange-900",
] as const;

function buildGroupSpans(cols: ColDef[]) {
  const spans: { group: string; count: number }[] = [];
  for (const c of cols) {
    if (spans.length && spans[spans.length-1].group === c.group) spans[spans.length-1].count++;
    else spans.push({ group: c.group, count: 1 });
  }
  return spans;
}

/** Görünür sütun sırası: prevOrder + görünürde olup listede olmayanlar (merged sırasıyla sonda). */
function orderedVisibleCols(mergedCols: ColDef[], visibleIds: Set<string>, prevOrder: string[]): ColDef[] {
  const visible = mergedCols.filter((c) => visibleIds.has(c.id));
  const visSet = new Set(visible.map((c) => c.id));
  const out: ColDef[] = [];
  const used = new Set<string>();
  for (const id of prevOrder) {
    if (!visSet.has(id)) continue;
    const col = mergedCols.find((c) => c.id === id);
    if (col) {
      out.push(col);
      used.add(id);
    }
  }
  for (const c of visible) {
    if (!used.has(c.id)) out.push(c);
  }
  return out;
}

function reorderColOrder(
  mergedCols: ColDef[],
  visibleIds: Set<string>,
  prevOrder: string[],
  fromId: string,
  toId: string,
): string[] {
  const orderedIds = orderedVisibleCols(mergedCols, visibleIds, prevOrder).map((c) => c.id);
  const fi = orderedIds.indexOf(fromId);
  const ti = orderedIds.indexOf(toId);
  if (fi < 0 || ti < 0 || fi === ti) return prevOrder;
  const next = [...orderedIds];
  const [moved] = next.splice(fi, 1);
  next.splice(ti, 0, moved);
  return next;
}

const COL_W_MIN = 40;
const COL_W_MAX = 900;

// ── localStorage ──────────────────────────────────────────────────────────────
const LS_VISIBLE  = "om_visible_cols";
const LS_COL_FILT = "om_col_filters";
const LS_TOP_FILT = "om_top_filters";
const LS_PRESETS  = "om_col_presets";
const LS_KOD_SON4 = "om_kod_son4_vurgula";
const LS_KOD_SON_N = "om_kod_son_n";
const LS_KOD_SON_REF = "om_kod_son_ref";
const LS_COL_CLICK_POS = "om_col_click_pos";
const LS_COL_ORDER = "om_col_order";
const LS_COL_WIDTHS = "om_col_widths";
const LS_SHOW_DIGIT_ROW = "om_show_digit_row";
const LS_VIEW_PRESETS = "om_view_presets";

const KOD_SUFFIX_LENS = [3, 4, 5] as const;
type KodSuffixN = (typeof KOD_SUFFIX_LENS)[number];

const KOD_SUFFIX_REF_OPTIONS = [
  { key: "id", label: "Maç kodu" },
  { key: "kod_ms", label: "MS kodu" },
  { key: "kod_iy", label: "İY kodu" },
  { key: "kod_cs", label: "ÇŞ kodu" },
  { key: "kod_au", label: "A/Ü kodu" },
] as const;
type KodSuffixRefKey = (typeof KOD_SUFFIX_REF_OPTIONS)[number]["key"];

function lsGet<T>(key: string, fb: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as T : fb; }
  catch { return fb; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
}

// ── preset (sadece sütun seçimi kaydeder) ─────────────────────────────────────
interface ColPreset { name: string; ids: string[]; }

/** Tam görünüm kaydı: sütun seçimi + filtreler + sıralama + düzen */
interface ViewPreset {
  name: string;
  createdAt: string;
  // sütunlar
  visibleIds: string[];
  colOrder: string[];
  colWidths: Record<string, number>;
  colClickPos: Record<string, number[]>;
  // filtreler
  topFilters: Record<string, string>;
  colFilters: Record<string, string>;
  bidirFilters?: BidirFiltersState;
  // sıralama
  sortCol: string | null;
  sortDir: "asc" | "desc";
  // kod sonek
  kodSon4: string;
  kodSuffixN: number;
  kodSuffixRefKey: string;
}

const EMPTY_TOP = { tarih_from:"", tarih_to:"", lig:"", takim:"", sonuc_iy:"", sonuc_ms:"", hakem:"", suffix4:"", suffix3:"" };

// ── Çift Yönlü (⇄) Arama ─────────────────────────────────────────────────────
type BidirTakimMode   = "ev" | "dep" | "ikisi";
type BidirPersonelMode = "hakem" | "ant" | "all";

interface BidirFiltersState {
  takim:    { pattern: string; committed: string; mode: BidirTakimMode };
  takimid:  { pattern: string; committed: string; mode: BidirTakimMode };
  personel: { pattern: string; committed: string; mode: BidirPersonelMode };
}

const BIDIR_INIT: BidirFiltersState = {
  takim:    { pattern: "", committed: "", mode: "ikisi" },
  takimid:  { pattern: "", committed: "", mode: "ikisi" },
  personel: { pattern: "", committed: "", mode: "all"   },
};

const BIDIR_TAKIM_MODES: { key: BidirTakimMode; label: string; title: string }[] = [
  { key: "ev",    label: "Ev",  title: "Yalnızca Ev Sahibi (t1)" },
  { key: "dep",   label: "Dep", title: "Yalnızca Deplasman (t2)" },
  { key: "ikisi", label: "⇄",   title: "Ev SAHİBİ veya Deplasman" },
];

const BIDIR_PERSONEL_MODES: { key: BidirPersonelMode; label: string; title: string }[] = [
  { key: "hakem", label: "Hk",  title: "Yalnızca Hakem" },
  { key: "ant",   label: "Ant", title: "Ev + Dep Teknik Direktör" },
  { key: "all",   label: "⇄",   title: "Hakem + Her İki Teknik Direktör" },
];

const LS_BIDIR        = "bidir_filters_v1";
const LS_SHOW_BIDIR   = "show_bidir_row_v1";

// ── Referans Maç ─────────────────────────────────────────────────────────────
/** Referans maçtan hangi alan kullanılacak */
type RefMatchField = "t1i" | "t2i" | "id" | "kod_ms" | "kod_iy";

const REF_MATCH_FIELDS: { key: RefMatchField; label: string; title: string }[] = [
  { key: "t1i",    label: "T1-ID",  title: "Ev Takım ID" },
  { key: "t2i",    label: "T2-ID",  title: "Dep Takım ID" },
  { key: "id",     label: "Maç ID", title: "Maç Kodu" },
  { key: "kod_ms", label: "MS Kod", title: "MS Oyun Kodu" },
  { key: "kod_iy", label: "İY Kod", title: "İY Oyun Kodu" },
];

interface RefMatchState {
  query: string;
  results: Match[];
  selected: Match | null;
  isOpen: boolean;
  loading: boolean;
  field: RefMatchField;
  positions: number[]; // seçili hane pozisyonları (1-tabanlı); boş = tam değer
}

const REF_MATCH_INIT: RefMatchState = {
  query: "", results: [], selected: null, isOpen: false, loading: false,
  field: "t1i", positions: [],
};

/** Seçilen maçtan + pozisyonlardan wildcard pattern üret */
function buildRefPattern(match: Match, field: RefMatchField, positions: number[]): string {
  const raw = String(match[field] ?? "").replace(/\D/g, "");
  if (!raw) return "";
  if (!positions.length) return raw;
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    out += positions.includes(i + 1) ? raw[i] : "?";
  }
  out = out.replace(/^\?+/, "*");
  return out;
}

/** Ref maç alanından → doğru filtreye yönlendir */
const REF_FIELD_TO_COL_ID: Partial<Record<RefMatchField, string>> = {
  id:     "id",
  kod_ms: "kod_ms",
  kod_iy: "kod_iy",
};

export default function MatchTable() {
  const [matches, setMatches]     = useState<Match[]>([]);
  const [loading, setLoading]     = useState(false);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  /** API 500/503 vb.; boş tablo ile karışmasın diye ayrı gösterilir */
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [balance, setBalance]      = useState<string | null>(null);
  const [rawKeyUnion, setRawKeyUnion] = useState<string[]>([]);

  // Balance: sayfa açılışında + her 2 dakikada bir güncelle
  useEffect(() => {
    const fetchBalance = () =>
      fetch("/api/balance")
        .then((r) => r.json())
        .then((j: { balance?: string | number }) => {
          if (j.balance != null) setBalance(String(j.balance));
        })
        .catch(() => {});
    fetchBalance();
    const id = setInterval(fetchBalance, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/matches/raw-keys")
      .then((r) => r.json())
      .then((j: { keys?: string[] }) => {
        setRawKeyUnion(Array.isArray(j.keys) ? j.keys : []);
      })
      .catch(() => setRawKeyUnion([]));
  }, []);

  const mergedCols = useMemo(() => mergeAllCols(rawKeyUnion), [rawKeyUnion]);

  // sütun görünürlük
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => {
    const s = lsGet<string[]>(LS_VISIBLE, []);
    return s.length ? new Set(s) : new Set(DEFAULT_VISIBLE);
  });
  const [showColPanel, setShowColPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  /** Ardışık fetch’lerde yalnızca son yanıtın state yazması için. */
  const matchesFetchGenRef = useRef(0);

  // sütun presetleri
  const [colPresets, setColPresets] = useState<ColPreset[]>(() => lsGet<ColPreset[]>(LS_PRESETS, []));
  const [presetInput, setPresetInput] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  // üst filtreler
  const [filters, setFilters] = useState(() => ({ ...EMPTY_TOP, ...lsGet<typeof EMPTY_TOP>(LS_TOP_FILT, EMPTY_TOP) }));
  const [applied, setApplied] = useState(() => ({ ...EMPTY_TOP, ...lsGet<typeof EMPTY_TOP>(LS_TOP_FILT, EMPTY_TOP) }));

  // sütun bazlı filtreler — display (her tuşta) vs committed (Enter ile)
  const [colFilters, setColFilters] = useState<Record<string,string>>(() => lsGet<Record<string,string>>(LS_COL_FILT, {}));
  const [colFiltersCommitted, setColFiltersCommitted] = useState<Record<string,string>>(() => lsGet<Record<string,string>>(LS_COL_FILT, {}));

  /** Satır süzmeden oyun kodu hücrelerinde sonek vurgusu; N ve kaynak kod seçilebilir. */
  const [kodSon4Highlight, setKodSon4Highlight] = useState(() => lsGet<string>(LS_KOD_SON4, ""));
  const [kodSuffixN, setKodSuffixN] = useState<KodSuffixN>(() => {
    const v = lsGet<number>(LS_KOD_SON_N, 4);
    return v === 3 || v === 4 || v === 5 ? v : 4;
  });
  const [kodSuffixRefKey, setKodSuffixRefKey] = useState<KodSuffixRefKey>(() => {
    const k = lsGet<string>(LS_KOD_SON_REF, "id");
    return KOD_SUFFIX_REF_OPTIONS.some((o) => o.key === k) ? (k as KodSuffixRefKey) : "id";
  });
  useEffect(() => { lsSet(LS_KOD_SON4, kodSon4Highlight); }, [kodSon4Highlight]);
  useEffect(() => { lsSet(LS_KOD_SON_N, kodSuffixN); }, [kodSuffixN]);
  // son 3/4/5 değişince kutudaki rakamları en fazla N ile sınırla (son N rakam)
  useEffect(() => {
    setKodSon4Highlight((prev) => {
      const d = prev.replace(/\D/g, "");
      if (d.length <= kodSuffixN) return d;
      return d.slice(-kodSuffixN);
    });
    setPage(1);
  }, [kodSuffixN]);
  useEffect(() => { lsSet(LS_KOD_SON_REF, kodSuffixRefKey); }, [kodSuffixRefKey]);

  function commitColFilters(next: Record<string,string>) {
    setColFiltersCommitted(next);
    lsSet(LS_COL_FILT, next);
    setPage(1);
  }

  // sütun sırası ve genişlikleri (Excel benzeri)
  const [colOrder, setColOrder] = useState<string[]>(() => lsGet<string[]>(LS_COL_ORDER, []));
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => lsGet<Record<string, number>>(LS_COL_WIDTHS, {}));
  const resizeRef = useRef<{ id: string; startX: number; startW: number } | null>(null);

  // hane seçici (digit-position click): hangi sütunda hangi hane pozisyonları seçili?
  // Boş dizi = H (tam değer), [1,3] = 1. ve 3. rakamlar sabit, geri kalanlar joker
  const [colClickPos, setColClickPos] = useState<Record<string, number[]>>(
    () => lsGet<Record<string, number[]>>(LS_COL_CLICK_POS, {})
  );
  // hane seçici satırı görünür mü?
  const [showDigitRow, setShowDigitRow] = useState<boolean>(
    () => lsGet<boolean>(LS_SHOW_DIGIT_ROW, false)
  );

  // çift yönlü arama
  const [bidirFilters, setBidirFilters] = useState<BidirFiltersState>(
    () => lsGet<BidirFiltersState>(LS_BIDIR, BIDIR_INIT)
  );
  const [showBidirRow, setShowBidirRow] = useState<boolean>(
    () => lsGet<boolean>(LS_SHOW_BIDIR, false)
  );
  // referans maç
  const [refMatch, setRefMatch] = useState<RefMatchState>(REF_MATCH_INIT);
  const refMatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refMatchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { lsSet(LS_COL_ORDER, colOrder); }, [colOrder]);
  useEffect(() => { lsSet(LS_COL_WIDTHS, colWidths); }, [colWidths]);
  useEffect(() => { lsSet(LS_COL_CLICK_POS, colClickPos); }, [colClickPos]);
  useEffect(() => { lsSet(LS_SHOW_DIGIT_ROW, showDigitRow); }, [showDigitRow]);
  useEffect(() => { lsSet(LS_BIDIR, bidirFilters); }, [bidirFilters]);
  useEffect(() => { lsSet(LS_SHOW_BIDIR, showBidirRow); }, [showBidirRow]);

  // Ref maç: pattern oluştur ve doğru filtreye yaz
  const applyRefToBidir = useCallback((
    match: Match,
    field: RefMatchField,
    positions: number[],
  ) => {
    const pat = buildRefPattern(match, field, positions);
    if (!pat) return;
    if (field === "t1i" || field === "t2i") {
      setBidirFilters((prev) => ({
        ...prev,
        takimid: { pattern: pat, committed: pat, mode: field === "t1i" ? "ev" : "dep" },
      }));
    } else {
      const colId = REF_FIELD_TO_COL_ID[field];
      if (colId) {
        setColFilters((prev) => {
          const next = { ...prev, [colId]: pat };
          commitColFilters(next);
          return next;
        });
      }
    }
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setBidirFilters, setColFilters]);

  // Ref maç arama (debounced)
  const searchRefMatches = useCallback(async (q: string) => {
    if (!q.trim()) {
      setRefMatch((prev) => ({ ...prev, results: [], isOpen: false, loading: false }));
      return;
    }
    setRefMatch((prev) => ({ ...prev, loading: true, isOpen: true }));
    try {
      const p = new URLSearchParams({ limit: "20" });
      const num = Number(q.trim());
      if (!isNaN(num) && q.trim().length > 3) {
        p.set("cf_id", q.trim());
      } else {
        p.set("takim", q.trim());
      }
      const res = await fetch(`/api/matches?${p}`);
      const json: ApiResponse = await res.json();
      setRefMatch((prev) => ({ ...prev, results: json.data ?? [], loading: false, isOpen: true }));
    } catch {
      setRefMatch((prev) => ({ ...prev, results: [], loading: false }));
    }
  }, []);

  // Ref dropdown dışına tıklayınca kapat
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (refMatchDropdownRef.current && !refMatchDropdownRef.current.contains(e.target as Node)) {
        setRefMatch((prev) => ({ ...prev, isOpen: false }));
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // görünüm presetleri
  const [viewPresets, setViewPresets] = useState<ViewPreset[]>(
    () => lsGet<ViewPreset[]>(LS_VIEW_PRESETS, [])
  );
  const [viewPresetInput, setViewPresetInput] = useState("");
  const [viewSaveMsg, setViewSaveMsg] = useState("");

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const dx = e.clientX - r.startX;
      const w = Math.min(COL_W_MAX, Math.max(COL_W_MIN, r.startW + dx));
      setColWidths((prev) => ({ ...prev, [r.id]: w }));
    };
    const onUp = () => {
      resizeRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // localStorage otomatik kaydet
  useEffect(() => { lsSet(LS_VISIBLE,  Array.from(visibleIds)); }, [visibleIds]);
  useEffect(() => { lsSet(LS_TOP_FILT, filters); },                [filters]);

  const colW = useCallback(
    (c: ColDef) => colWidths[c.id] ?? c.width ?? 60,
    [colWidths]
  );

  const visibleCols = useMemo(
    () => orderedVisibleCols(mergedCols, visibleIds, colOrder),
    [mergedCols, visibleIds, colOrder]
  );
  const groupSpans   = buildGroupSpans(visibleCols);
  const groups       = Array.from(new Set(mergedCols.map((c) => c.group)));

  // Sunucu: tüm cf_* (OKBT obktb_* dahil). İstemci: yalnızca CF_CLIENT_ONLY_COL_IDS (genelde boş).
  const rawColFilters = Object.fromEntries(
    Object.entries(colFiltersCommitted).filter(([id]) => CF_CLIENT_ONLY_COL_IDS.has(id))
  );
  const filteredRows = applyColFilters(matches, rawColFilters, visibleCols);

  // ── Sıralama ──────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (colId: string) => {
    if (sortCol !== colId) {
      setSortCol(colId);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      // desc'ten sonra sıralamayı kaldır
      setSortCol(null);
      setSortDir("asc");
    }
  };

  // dbCol filtreleri değişince server fetch
  const [dbColFiltersApplied, setDbColFiltersApplied] = useState<Record<string,string>>({});
  useEffect(() => {
    const dbPart = Object.fromEntries(
      Object.entries(colFiltersCommitted).filter(
        ([id, v]) => v.trim() && !CF_CLIENT_ONLY_COL_IDS.has(id)
      )
    );
    setDbColFiltersApplied(dbPart);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colFiltersCommitted]);

  /** Üst / sütun filtresi veya bu kutudan: tüm satırlarda aynı sonek. Boşsa satıra göre seçilen kodun son N hanesi. */
  const globalKodSuffix = useMemo(() => {
    return (
      normalizeKodSuffixDigits(String(applied.suffix4 ?? ""), kodSuffixN) ??
      normalizeKodSuffixDigits(String(dbColFiltersApplied.suffix4 ?? ""), kodSuffixN) ??
      normalizeKodSuffixDigits(kodSon4Highlight.trim(), kodSuffixN)
    );
  }, [applied.suffix4, dbColFiltersApplied.suffix4, kodSon4Highlight, kodSuffixN]);

  const kodSuffixRefLabel = KOD_SUFFIX_REF_OPTIONS.find((o) => o.key === kodSuffixRefKey)?.label ?? kodSuffixRefKey;

  /** Üst / cf MBS filtresi aktifse satır alanı mac_suffix4; yoksa Kod açılır listesindeki alan. */
  const kodSuffixFilterRowKey = useMemo(() => {
    const fromApplied = normalizeKodSuffixDigits(String(applied.suffix4 ?? ""), kodSuffixN);
    const fromCf = normalizeKodSuffixDigits(String(dbColFiltersApplied.suffix4 ?? ""), kodSuffixN);
    if (fromApplied != null || fromCf != null) return "mac_suffix4";
    return kodSuffixRefKey;
  }, [applied.suffix4, dbColFiltersApplied.suffix4, kodSuffixN, kodSuffixRefKey]);

  /** Sabit sonek varken yalnızca o son N haneye uyan satırlar (sarı vurgu + liste birlikte). */
  const kodSuffixFilteredRows = useMemo(() => {
    if (!globalKodSuffix) return filteredRows;
    return filteredRows.filter((row) => {
      const suf = normalizeKodSuffixDigits(String(row[kodSuffixFilterRowKey] ?? ""), kodSuffixN);
      return suf === globalKodSuffix;
    });
  }, [filteredRows, globalKodSuffix, kodSuffixN, kodSuffixFilterRowKey]);

  const sortedRows = useMemo(() => {
    if (!sortCol) return kodSuffixFilteredRows;
    const col = mergedCols.find((c) => c.id === sortCol);
    if (!col) return kodSuffixFilteredRows;
    return [...kodSuffixFilteredRows].sort((a, b) => {
      const av = cellVal(a, col);
      const bv = cellVal(b, col);
      const an = Number(av), bn = Number(bv);
      let cmp: number;
      if (av !== "" && bv !== "" && !isNaN(an) && !isNaN(bn)) {
        cmp = an - bn;
      } else {
        cmp = av.localeCompare(bv, "tr", { sensitivity: "base" });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [kodSuffixFilteredRows, sortCol, sortDir, mergedCols]);

  // veri çek
  const fetchMatches = useCallback(async () => {
    const myGen = ++matchesFetchGenRef.current;
    setLoading(true);
    setFetchError(null);
    const p = new URLSearchParams({ page: String(page), limit: "100" });
    Object.entries(applied).forEach(([k,v]) => { if (v.trim()) p.set(k, v.trim()); });
    // dbCol sütun filtrelerini cf_ prefix ile gönder
    Object.entries(dbColFiltersApplied).forEach(([id, v]) => {
      if (v.trim()) p.set(`cf_${id}`, v.trim());
    });
    // Çift yönlü (⇄) arama parametreleri
    if (bidirFilters.takim.committed.trim()) {
      p.set("bidir_takim",      bidirFilters.takim.committed.trim());
      p.set("bidir_takim_mode", bidirFilters.takim.mode);
    }
    if (bidirFilters.takimid.committed.trim()) {
      p.set("bidir_takimid",      bidirFilters.takimid.committed.trim());
      p.set("bidir_takimid_mode", bidirFilters.takimid.mode);
    }
    if (bidirFilters.personel.committed.trim()) {
      p.set("bidir_personel",      bidirFilters.personel.committed.trim());
      p.set("bidir_personel_mode", bidirFilters.personel.mode);
    }
    // Üst kod kutusu: MBS üst/sütun filtresi yoksa tüm DB’de son N hane (API + görünüm)
    const fromAppliedS4 = normalizeKodSuffixDigits(String(applied.suffix4 ?? ""), kodSuffixN);
    const fromCfS4 = normalizeKodSuffixDigits(String(dbColFiltersApplied.suffix4 ?? ""), kodSuffixN);
    const gHighlight = normalizeKodSuffixDigits(kodSon4Highlight.trim(), kodSuffixN);
    if (fromAppliedS4 == null && fromCfS4 == null && gHighlight != null) {
      p.set("ks_ref", kodSuffixRefKey);
      p.set("ks_n", String(kodSuffixN));
      p.set("ks_suffix", gHighlight);
    }
    try {
      const [res, syncRes] = await Promise.all([
        fetch(`/api/matches?${p}`),
        fetch("/api/sync-status"),
      ]);
      const json: ApiResponse = await res.json();
      if (matchesFetchGenRef.current !== myGen) return;
      if (!res.ok) {
        const hint =
          json.error ||
          json.detail ||
          (typeof json === "object" && json && "message" in json
            ? String((json as { message?: string }).message)
            : "");
        setFetchError(hint.trim() || `Sunucu hatası (${res.status})`);
        setMatches([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }
      const tp = Math.max(0, json.totalPages ?? 0);
      const t = json.total ?? 0;
      setMatches(json.data || []);
      setTotal(t);
      setTotalPages(tp);
      // Dar filtre sonrası toplam sayfa küçülürken sayfa eski kalırsa API boş sayfa döner → "Veri yok"
      if (tp > 0 && page > tp) setPage(tp);
      else if (tp === 0 && page !== 1) setPage(1);
      if (syncRes.ok) {
        const s = (await syncRes.json()) as { lastSyncAt?: string | null };
        if (matchesFetchGenRef.current === myGen) {
          setLastSyncAt(s.lastSyncAt ?? null);
        }
      }
    } catch {
      if (matchesFetchGenRef.current === myGen) {
        setMatches([]);
        setFetchError("Ağ hatası veya yanıt okunamadı.");
      }
    } finally {
      if (matchesFetchGenRef.current === myGen) setLoading(false);
    }
  }, [page, applied, dbColFiltersApplied, kodSuffixN, kodSuffixRefKey, kodSon4Highlight]);
  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  // panel dışı tıkla kapat
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShowColPanel(false); };
    if (showColPanel) document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [showColPanel]);

  // sütun işlemleri
  function toggleCol(id: string) { setVisibleIds((p) => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }
  function toggleGroup(grp: string) {
    const ids = mergedCols.filter((c) => c.group===grp).map((c) => c.id);
    const allOn = ids.every((id) => visibleIds.has(id));
    setVisibleIds((p) => { const n=new Set(p); ids.forEach((id) => allOn?n.delete(id):n.add(id)); return n; });
  }
  function selectAll()  { setVisibleIds(new Set(mergedCols.map((c) => c.id))); }
  function resetCols()  { const d=new Set(DEFAULT_VISIBLE); setVisibleIds(d); lsSet(LS_VISIBLE, Array.from(d)); }
  function hideAll()    { setVisibleIds(new Set()); }

  // preset işlemleri
  function saveColPreset() {
    const name = presetInput.trim();
    if (!name) return;
    const updated = [{ name, ids: Array.from(visibleIds) }, ...colPresets.filter((p) => p.name !== name)];
    setColPresets(updated);
    lsSet(LS_PRESETS, updated);
    setPresetInput("");
    setSaveMsg(`"${name}" kaydedildi`);
    setTimeout(() => setSaveMsg(""), 2000);
  }
  function loadColPreset(p: ColPreset) { setVisibleIds(new Set(p.ids)); }
  function deleteColPreset(name: string) {
    const updated = colPresets.filter((p) => p.name !== name);
    setColPresets(updated);
    lsSet(LS_PRESETS, updated);
  }

  /** Tüm sütun filtre inputlarını temizle (görünür/gizli fark etmez) */
  function clearColumnFiltersOnly() {
    setColFilters({});
    setColFiltersCommitted({});
    lsSet(LS_COL_FILT, {});
    setPage(1);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-200 text-gray-900 overflow-hidden">

      {/* ── HEADER ── */}
      <header className="flex-none border-b border-gray-300 bg-gray-300">
        {fetchError && (
          <div
            className="px-4 py-1.5 text-xs text-red-900 bg-red-100 border-b border-red-200"
            role="alert">
            {fetchError}
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
          <span className="text-xs text-gray-700 whitespace-nowrap">
            {total.toLocaleString("tr-TR")} maç
            {lastSyncAt && (
              <span className="text-gray-700">
                {" "}
                · son veri çekimi:{" "}
                <span className="text-gray-800 tabular-nums" title="Europe/Istanbul">
                  {formatLastSyncTr(lastSyncAt)}
                </span>
              </span>
            )}
            {loading && <span className="ml-1.5 inline-block w-3 h-3 border-2 border-gray-500 border-t-blue-400 rounded-full animate-spin align-middle" />}
            {(Object.values(colFiltersCommitted).some(Boolean) || globalKodSuffix) && !loading && (
              <span className="text-amber-600"> · {kodSuffixFilteredRows.length} eşleşti</span>
            )}
            {globalKodSuffix && !loading && (
              <span
                className="text-amber-800 whitespace-nowrap"
                title={`Son ${kodSuffixN} rakam eşleşmesi: tablo yalnızca bu soneki taşıyan satırları listeler; oyun kodu hücreleri sarı vurgulanır.`}>
                · son {kodSuffixN}: <span className="font-mono font-semibold">{globalKodSuffix}</span>
              </span>
            )}
          </span>

          <div
            className="flex items-center gap-1 text-[11px] text-gray-800 whitespace-nowrap shrink-0"
            title="Kutuya N rakam yazınca tablo yalnızca seçili kod alanında bu son N haneye sahip satırları gösterir ve oyun kodu hücrelerinde sarı vurgu yapar. Kutu boşken satır bazlı vurgu (filtre yok). Üst MBS (suffix4) filtresi varsa sonek mac_suffix4 üzerinden süzülür.">
            <label className="flex items-center gap-0.5">
              <span className="hidden sm:inline text-gray-700">Kod</span>
              <select
                value={kodSuffixRefKey}
                onChange={(e) => {
                  setKodSuffixRefKey(e.target.value as KodSuffixRefKey);
                  setPage(1);
                }}
                className="max-w-[7.5rem] sm:max-w-none bg-white border border-gray-400 rounded px-0.5 py-0.5 text-[11px] text-gray-900 focus:outline-none focus:border-blue-500">
                {KOD_SUFFIX_REF_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-0.5">
              <span className="text-gray-700">son</span>
              <select
                value={kodSuffixN}
                onChange={(e) => {
                  setKodSuffixN(Number(e.target.value) as KodSuffixN);
                  setPage(1);
                }}
                className="bg-white border border-gray-400 rounded px-1 py-0.5 text-[11px] text-gray-900 focus:outline-none focus:border-blue-500">
                {KOD_SUFFIX_LENS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={kodSon4Highlight}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, kodSuffixN);
                setKodSon4Highlight(d);
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setKodSon4Highlight("");
                  setPage(1);
                }
              }}
              placeholder={kodSuffixN === 3 ? "575" : kodSuffixN === 5 ? "15754" : "5754"}
              maxLength={kodSuffixN}
              title={`En fazla ${kodSuffixN} rakam. Boş bırakırsanız her satırda «${kodSuffixRefLabel}» son ${kodSuffixN} hane kullanılır.`}
              className="w-[5.25rem] bg-white border border-gray-400 rounded px-1 py-0.5 text-[11px] font-mono text-gray-900 focus:outline-none focus:border-blue-500"
            />
            {kodSon4Highlight.trim() ? (
              <button
                type="button"
                onClick={() => {
                  setKodSon4Highlight("");
                  setPage(1);
                }}
                className="text-gray-600 hover:text-gray-900 px-0.5"
                title="Kutuyu temizle (satıra göre vurgu)">
                {"\u2715"}
              </button>
            ) : null}
          </div>

          {/* Sütunlar butonu */}
          <div className="relative ml-auto flex items-center gap-3" ref={panelRef}>
            {balance != null && (
              <span className="text-xs text-gray-700 whitespace-nowrap">
                Bakiye:{" "}
                <span className="font-semibold text-gray-900">{balance}</span>
              </span>
            )}
            <button
              type="button"
              onClick={clearColumnFiltersOnly}
              title="Tüm sütun filtrelerini sıfırlar (ara kutuları)"
              className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 text-xs px-3 py-1.5 rounded transition font-medium whitespace-nowrap">
              Sütunları temizle
            </button>
            <button
              type="button"
              onClick={() => setShowDigitRow((v) => !v)}
              title="Hane seçici satırını göster / gizle"
              className={`border text-xs px-3 py-1.5 rounded transition font-medium whitespace-nowrap ${
                showDigitRow
                  ? "bg-green-700 border-green-800 text-white hover:bg-green-600"
                  : "bg-white border-gray-300 text-gray-900 hover:bg-gray-100"
              }`}
            >
              {showDigitRow ? "⊞ Hane ✓" : "⊞ Hane"}
            </button>
            <button
              type="button"
              onClick={() => setShowBidirRow((v) => !v)}
              title="Çift yönlü (⇄) arama satırını göster / gizle"
              className={`border text-xs px-3 py-1.5 rounded transition font-medium whitespace-nowrap ${
                showBidirRow
                  ? "bg-blue-700 border-blue-800 text-white hover:bg-blue-600"
                  : "bg-white border-gray-300 text-gray-900 hover:bg-gray-100"
              }`}
            >
              {showBidirRow ? "⇄ Çift Yönlü ✓" : "⇄ Çift Yönlü"}
            </button>
            <button onClick={() => setShowColPanel((v) => !v)}
              className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 text-xs px-3 py-1.5 rounded transition font-medium whitespace-nowrap">
              ☰ Sütunlar ({visibleIds.size})
            </button>

            {showColPanel && (
              <div className="absolute right-0 top-full mt-1 z-50 w-[620px] max-h-[80vh] overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-2xl p-3">

                {/* ── Araç çubuğu ── */}
                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-700">
                  <button onClick={selectAll} className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded">Hepsini Seç</button>
                  <button onClick={resetCols} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-900 px-2 py-1 rounded border border-gray-300">Varsayılan</button>
                  <button onClick={hideAll}   className="text-xs bg-red-900/60 hover:bg-red-800/60 px-2 py-1 rounded">Hepsini Gizle</button>
                  <span className="text-xs text-gray-700 self-center ml-auto">{visibleIds.size} / {mergedCols.length}</span>
                </div>

                {/* ── GÖRÜNÜM KAYDET / YÜKLE (tam filtre + düzen) ── */}
                <div className="mb-3 pb-3 border-b border-gray-700">
                  <p className="text-[11px] text-gray-800 mb-1 font-semibold uppercase tracking-wide">Görünüm Kaydet</p>
                  <p className="text-[10px] text-gray-600 mb-1.5">Tüm filtreler, sütunlar, sıralama ve hane seçimleri birlikte kaydedilir.</p>
                  <div className="flex gap-1.5 items-center mb-2">
                    <input
                      value={viewPresetInput}
                      onChange={(e) => setViewPresetInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const name = viewPresetInput.trim();
                          if (!name) return;
                          const preset: ViewPreset = {
                            name,
                            createdAt: new Date().toISOString(),
                            visibleIds: Array.from(visibleIds),
                            colOrder,
                            colWidths,
                            colClickPos,
                            topFilters: { ...filters },
                            colFilters: { ...colFiltersCommitted },
                            bidirFilters: { ...bidirFilters },
                            sortCol,
                            sortDir,
                            kodSon4: kodSon4Highlight,
                            kodSuffixN,
                            kodSuffixRefKey,
                          };
                          const updated = [preset, ...viewPresets.filter((v) => v.name !== name)];
                          setViewPresets(updated);
                          lsSet(LS_VIEW_PRESETS, updated);
                          setViewPresetInput("");
                          setViewSaveMsg(`"${name}" kaydedildi`);
                          setTimeout(() => setViewSaveMsg(""), 2500);
                        }
                      }}
                      placeholder="Görünüm adı… (Enter ile kaydet)"
                      className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const name = viewPresetInput.trim();
                        if (!name) return;
                        const preset: ViewPreset = {
                          name,
                          createdAt: new Date().toISOString(),
                          visibleIds: Array.from(visibleIds),
                          colOrder,
                          colWidths,
                          colClickPos,
                          topFilters: { ...filters },
                          colFilters: { ...colFiltersCommitted },
                          sortCol,
                          sortDir,
                          kodSon4: kodSon4Highlight,
                          kodSuffixN,
                          kodSuffixRefKey,
                        };
                        const updated = [preset, ...viewPresets.filter((v) => v.name !== name)];
                        setViewPresets(updated);
                        lsSet(LS_VIEW_PRESETS, updated);
                        setViewPresetInput("");
                        setViewSaveMsg(`"${name}" kaydedildi`);
                        setTimeout(() => setViewSaveMsg(""), 2500);
                      }}
                      className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium transition whitespace-nowrap">
                      {"\uD83D\uDCBE"} Kaydet
                    </button>
                    {viewSaveMsg && <span className="text-xs text-green-600">{viewSaveMsg}</span>}
                  </div>
                  {viewPresets.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {viewPresets.map((vp) => (
                        <div key={vp.name} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-blue-900 truncate block">{vp.name}</span>
                            <span className="text-[10px] text-gray-500">
                              {new Date(vp.createdAt).toLocaleDateString("tr-TR")} ·{" "}
                              {Object.values(vp.colFilters).filter(Boolean).length} sütun filtresi
                            </span>
                          </div>
                          <button
                            type="button"
                            title="Bu görünümü yükle"
                            onClick={() => {
                              setVisibleIds(new Set(vp.visibleIds));
                              setColOrder(vp.colOrder);
                              setColWidths(vp.colWidths);
                              setColClickPos(vp.colClickPos);
                              setFilters({ ...EMPTY_TOP, ...vp.topFilters });
                              setApplied({ ...EMPTY_TOP, ...vp.topFilters });
                              setColFilters(vp.colFilters);
                              commitColFilters(vp.colFilters);
                              if (vp.bidirFilters) setBidirFilters(vp.bidirFilters);
                              setSortCol(vp.sortCol);
                              setSortDir(vp.sortDir);
                              setKodSon4Highlight(vp.kodSon4);
                              setKodSuffixN(vp.kodSuffixN as KodSuffixN);
                              setKodSuffixRefKey(vp.kodSuffixRefKey as KodSuffixRefKey);
                              setPage(1);
                              setShowColPanel(false);
                            }}
                            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded transition whitespace-nowrap">
                            {"\uD83D\uDCC2"} Yükle
                          </button>
                          <button
                            type="button"
                            title="Sil"
                            onClick={() => {
                              const updated = viewPresets.filter((v) => v.name !== vp.name);
                              setViewPresets(updated);
                              lsSet(LS_VIEW_PRESETS, updated);
                            }}
                            className="text-gray-500 hover:text-red-500 transition text-xs px-1">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── PRESET KAYDET / YÜKLE (yalnızca sütun seçimi) ── */}
                <div className="mb-3 pb-3 border-b border-gray-700">
                  <p className="text-[11px] text-gray-800 mb-1.5 font-semibold uppercase tracking-wide">Sütun Düzenini Kaydet</p>
                  <div className="flex gap-1.5 items-center mb-2">
                    <input
                      value={presetInput}
                      onChange={(e) => setPresetInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveColPreset(); }}
                      placeholder="Preset adı… (örn: Temel görünüm)"
                      className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                    <button onClick={saveColPreset}
                      className="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition whitespace-nowrap">
                      💾 Kaydet
                    </button>
                    {saveMsg && <span className="text-xs text-green-400">{saveMsg}</span>}
                  </div>

                  {/* Kayıtlı presetler */}
                  {colPresets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {colPresets.map((p) => (
                        <div key={p.name} className="flex items-center gap-1 bg-gray-100 border border-gray-300 rounded px-2 py-1">
                          <button onClick={() => loadColPreset(p)} className="text-xs text-blue-300 hover:text-blue-200 transition">
                            📂 {p.name}
                          </button>
                          <button onClick={() => deleteColPreset(p.name)} className="text-gray-500 hover:text-red-400 transition ml-1 text-xs">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Sütun grupları ── */}
                {groups.map((grp) => {
                  const cols = mergedCols.filter((c) => c.group === grp);
                  const onCount = cols.filter((c) => visibleIds.has(c.id)).length;
                  const color = GROUP_COLORS[grp] ?? "bg-gray-200";
                  return (
                    <div key={grp} className="mb-3">
                      <button onClick={() => toggleGroup(grp)}
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${color} w-full text-left mb-1`}>
                        {grp} <span className="text-gray-700 font-normal">({onCount}/{cols.length})</span>
                      </button>
                      <div className="flex flex-wrap gap-1 pl-1">
                        {cols.map((c) => (
                          <button key={c.id} onClick={() => toggleCol(c.id)}
                            className={`text-[11px] px-2 py-0.5 rounded border transition ${
                              visibleIds.has(c.id) ? "bg-blue-600 border-blue-500 text-white" : "bg-white border-gray-300 text-gray-800 hover:bg-gray-100"
                            }`}>
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Çift Yönlü (⇄) Arama Satırı ── */}
        {showBidirRow && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-blue-50 border-t border-blue-200 text-xs">
            <span className="font-semibold text-blue-700 shrink-0">⇄</span>

            {/* ── Referans Maç ── */}
            <div className="flex items-center gap-1 border-r border-blue-200 pr-2 mr-1" ref={refMatchDropdownRef}>
              <span className="text-blue-700 font-semibold shrink-0">Ref</span>

              {/* Alan seçici */}
              <div className="flex rounded overflow-hidden border border-gray-300">
                {REF_MATCH_FIELDS.map((f) => (
                  <button key={f.key} type="button" title={f.title}
                    onClick={() => setRefMatch((prev) => ({ ...prev, field: f.key }))}
                    className={`px-1.5 py-0.5 text-[10px] font-medium transition ${refMatch.field === f.key ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-blue-50"}`}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Arama kutusu */}
              <div className="relative">
                <input
                  value={refMatch.query}
                  onChange={(e) => {
                    const q = e.target.value;
                    setRefMatch((prev) => ({ ...prev, query: q, selected: q ? prev.selected : null }));
                    if (refMatchTimerRef.current) clearTimeout(refMatchTimerRef.current);
                    refMatchTimerRef.current = setTimeout(() => searchRefMatches(q), 350);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setRefMatch((prev) => ({ ...prev, query: "", selected: null, results: [], isOpen: false }));
                    }
                  }}
                  onFocus={() => { if (refMatch.results.length) setRefMatch((prev) => ({ ...prev, isOpen: true })); }}
                  placeholder={refMatch.selected ? "" : "Takım adı / maç ID…"}
                  className={`w-36 bg-white border rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-blue-500 ${refMatch.selected ? "border-blue-500" : "border-gray-300"}`}
                />
                {/* Seçili maç etiketi */}
                {refMatch.selected && !refMatch.query && (
                  <span className="absolute inset-0 flex items-center px-1.5 text-[10px] text-blue-700 font-medium pointer-events-none truncate">
                    {refMatch.selected["id"]} · {String(refMatch.selected["t1"] ?? "").slice(0, 12)}
                  </span>
                )}
                {/* Dropdown */}
                {refMatch.isOpen && (
                  <div className="absolute left-0 top-full mt-0.5 z-50 w-72 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg">
                    {refMatch.loading && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-500">Aranıyor…</div>
                    )}
                    {!refMatch.loading && refMatch.results.length === 0 && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-400">Sonuç yok</div>
                    )}
                    {refMatch.results.map((m, i) => (
                      <button key={i} type="button"
                        className="w-full text-left px-2 py-1 text-[11px] hover:bg-blue-50 transition truncate border-b border-gray-100"
                        onClick={() => {
                          setRefMatch((prev) => ({ ...prev, selected: m, query: "", isOpen: false, results: [] }));
                          applyRefToBidir(m, refMatch.field, refMatch.positions);
                        }}>
                        <span className="font-mono text-gray-500 mr-1">{String(m["id"])}</span>
                        <span className="text-gray-800">{String(m["t1"] ?? "")} – {String(m["t2"] ?? "")}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pozisyon seçici — seçili maç varsa göster */}
              {refMatch.selected && (() => {
                const rawVal = String(refMatch.selected[refMatch.field] ?? "").replace(/\D/g, "");
                if (!rawVal) return null;
                return (
                  <div className="flex items-center gap-0.5">
                    <span className="text-gray-500 text-[10px]">Hane:</span>
                    {rawVal.split("").map((ch, i) => {
                      const pos = i + 1;
                      const isSel = refMatch.positions.includes(pos);
                      return (
                        <button key={pos} type="button"
                          title={`${DIGIT_POS_LABEL[pos] ?? pos}. hane = ${ch}`}
                          onClick={() => {
                            setRefMatch((prev) => {
                              const next = isSel
                                ? prev.positions.filter((p) => p !== pos)
                                : [...prev.positions, pos].sort((a, b) => a - b);
                              applyRefToBidir(prev.selected!, prev.field, next);
                              return { ...prev, positions: next };
                            });
                          }}
                          className={`w-[18px] h-[18px] text-[9px] flex items-center justify-center rounded border font-bold transition ${isSel ? "bg-blue-600 border-blue-700 text-white" : "bg-white border-gray-400 text-gray-600 hover:bg-blue-100"}`}>
                          {DIGIT_POS_LABEL[pos] ?? pos}
                        </button>
                      );
                    })}
                    <span className="text-[10px] font-mono text-blue-700 ml-1">
                      = {buildRefPattern(refMatch.selected, refMatch.field, refMatch.positions)}
                    </span>
                  </div>
                );
              })()}

              {refMatch.selected && (
                <button type="button" title="Referans maçı temizle"
                  onClick={() => {
                    setRefMatch(REF_MATCH_INIT);
                    setBidirFilters((prev) => ({
                      ...prev,
                      takimid: { pattern: "", committed: "", mode: prev.takimid.mode },
                    }));
                    setPage(1);
                  }}
                  className="text-gray-500 hover:text-red-600 px-0.5">×</button>
              )}
            </div>

            {/* Takım adı */}
            <div className="flex items-center gap-1">
              <span className="text-gray-600 shrink-0">Takım</span>
              <div className="flex rounded overflow-hidden border border-gray-300">
                {BIDIR_TAKIM_MODES.map((m) => (
                  <button key={m.key} type="button" title={m.title}
                    onClick={() => setBidirFilters((prev) => ({ ...prev, takim: { ...prev.takim, mode: m.key } }))}
                    className={`px-1.5 py-0.5 text-[10px] font-medium transition ${bidirFilters.takim.mode === m.key ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-blue-50"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <input
                value={bidirFilters.takim.pattern}
                onChange={(e) => setBidirFilters((prev) => ({ ...prev, takim: { ...prev.takim, pattern: e.target.value } }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setBidirFilters((prev) => ({ ...prev, takim: { ...prev.takim, committed: prev.takim.pattern } }));
                    setPage(1);
                  } else if (e.key === "Escape") {
                    setBidirFilters((prev) => ({ ...prev, takim: { pattern: "", committed: "", mode: prev.takim.mode } }));
                    setPage(1);
                  }
                }}
                placeholder="*ray, gal*… (Enter)"
                className={`w-28 bg-white border rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-blue-500 ${bidirFilters.takim.committed ? "border-blue-500" : "border-gray-300"}`}
              />
              {(bidirFilters.takim.pattern || bidirFilters.takim.committed) && (
                <button type="button" onClick={() => { setBidirFilters((prev) => ({ ...prev, takim: { pattern: "", committed: "", mode: prev.takim.mode } })); setPage(1); }}
                  className="text-gray-500 hover:text-gray-900 px-0.5" title="Temizle">×</button>
              )}
            </div>

            {/* Takım ID */}
            <div className="flex items-center gap-1">
              <span className="text-gray-600 shrink-0">T-ID</span>
              <div className="flex rounded overflow-hidden border border-gray-300">
                {BIDIR_TAKIM_MODES.map((m) => (
                  <button key={m.key} type="button" title={m.title}
                    onClick={() => setBidirFilters((prev) => ({ ...prev, takimid: { ...prev.takimid, mode: m.key } }))}
                    className={`px-1.5 py-0.5 text-[10px] font-medium transition ${bidirFilters.takimid.mode === m.key ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-blue-50"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <input
                value={bidirFilters.takimid.pattern}
                onChange={(e) => setBidirFilters((prev) => ({ ...prev, takimid: { ...prev.takimid, pattern: e.target.value } }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setBidirFilters((prev) => ({ ...prev, takimid: { ...prev.takimid, committed: prev.takimid.pattern } }));
                    setPage(1);
                  } else if (e.key === "Escape") {
                    setBidirFilters((prev) => ({ ...prev, takimid: { pattern: "", committed: "", mode: prev.takimid.mode } }));
                    setPage(1);
                  }
                }}
                placeholder="2793… (Enter)"
                className={`w-20 bg-white border rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-blue-500 ${bidirFilters.takimid.committed ? "border-blue-500" : "border-gray-300"}`}
              />
              {(bidirFilters.takimid.pattern || bidirFilters.takimid.committed) && (
                <button type="button" onClick={() => { setBidirFilters((prev) => ({ ...prev, takimid: { pattern: "", committed: "", mode: prev.takimid.mode } })); setPage(1); }}
                  className="text-gray-500 hover:text-gray-900 px-0.5" title="Temizle">×</button>
              )}
            </div>

            {/* Personel (hakem + antrenörler) */}
            <div className="flex items-center gap-1">
              <span className="text-gray-600 shrink-0">Personel</span>
              <div className="flex rounded overflow-hidden border border-gray-300">
                {BIDIR_PERSONEL_MODES.map((m) => (
                  <button key={m.key} type="button" title={m.title}
                    onClick={() => setBidirFilters((prev) => ({ ...prev, personel: { ...prev.personel, mode: m.key } }))}
                    className={`px-1.5 py-0.5 text-[10px] font-medium transition ${bidirFilters.personel.mode === m.key ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-blue-50"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <input
                value={bidirFilters.personel.pattern}
                onChange={(e) => setBidirFilters((prev) => ({ ...prev, personel: { ...prev.personel, pattern: e.target.value } }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setBidirFilters((prev) => ({ ...prev, personel: { ...prev.personel, committed: prev.personel.pattern } }));
                    setPage(1);
                  } else if (e.key === "Escape") {
                    setBidirFilters((prev) => ({ ...prev, personel: { pattern: "", committed: "", mode: prev.personel.mode } }));
                    setPage(1);
                  }
                }}
                placeholder="*smith… (Enter)"
                className={`w-28 bg-white border rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-blue-500 ${bidirFilters.personel.committed ? "border-blue-500" : "border-gray-300"}`}
              />
              {(bidirFilters.personel.pattern || bidirFilters.personel.committed) && (
                <button type="button" onClick={() => { setBidirFilters((prev) => ({ ...prev, personel: { pattern: "", committed: "", mode: prev.personel.mode } })); setPage(1); }}
                  className="text-gray-500 hover:text-gray-900 px-0.5" title="Temizle">×</button>
              )}
            </div>
          </div>
        )}

        {/* Grup renk çubuğu */}
        <div className="flex overflow-x-auto">
          {groups.map((grp) => {
            const cnt = mergedCols.filter((c) => c.group===grp && visibleIds.has(c.id)).length;
            if (cnt === 0) return null;
            return (
              <button key={grp} onClick={() => toggleGroup(grp)}
                className={`text-[10px] px-2 py-0.5 whitespace-nowrap border-r border-gray-300 text-gray-900 ${GROUP_COLORS[grp]??"bg-gray-200"} hover:brightness-95 transition`}>
                {grp} <span className="text-gray-600">·{cnt}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ── TABLO ── */}
      <div className="flex-1 overflow-auto relative">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-200/70 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-xs text-gray-800">Yükleniyor…</span>
            </div>
          </div>
        )}
        <table className="text-xs border-collapse table-fixed" style={{ minWidth: visibleCols.reduce((s,c) => s+colW(c), 0) }}>
          <thead className="sticky top-0 z-20">
            <tr>
              {groupSpans.map((gs, i) => (
                <th key={i} colSpan={gs.count}
                  className={`px-1 py-0.5 text-center text-[10px] font-semibold text-gray-900 border-b border-gray-400 border-r border-gray-400 whitespace-nowrap ${GROUP_COLORS[gs.group]??"bg-gray-300"}`}>
                  {gs.group}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-300">
              {visibleCols.map((c) => (
                <th
                  key={c.id}
                  style={{ width: colW(c), minWidth: colW(c), maxWidth: colW(c) }}
                  className="relative px-1.5 py-1 text-left font-medium text-gray-900 whitespace-nowrap border-b border-gray-400 border-r border-gray-400 select-none group"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromId = e.dataTransfer.getData("text/plain");
                    if (!fromId || fromId === c.id) return;
                    setColOrder((prev) => reorderColOrder(mergedCols, visibleIds, prev, fromId, c.id));
                  }}
                >
                  <div className="flex items-stretch gap-0.5 pr-2">
                    <span
                      draggable
                      title="Sürükleyerek sırala"
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", c.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-800 px-0.5 -ml-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {"\u22EE\u22EE"}
                    </span>
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-0.5 text-left font-medium text-gray-900 hover:bg-gray-400/40 rounded px-0.5 -mx-0.5 cursor-pointer"
                      onClick={() => handleSort(c.id)}
                    >
                      <span className="truncate">{c.label}</span>
                      {sortCol === c.id ? (
                        <span className="text-blue-700 text-[10px] shrink-0">
                          {sortDir === "asc" ? " \u25B2" : " \u25BC"}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[10px] opacity-0 group-hover:opacity-100 shrink-0">
                          {" \u21C5"}
                        </span>
                      )}
                    </button>
                  </div>
                  <div
                    role="separator"
                    title="Genişlet / daralt"
                    className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize hover:bg-blue-500/50"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      resizeRef.current = { id: c.id, startX: e.clientX, startW: colW(c) };
                    }}
                  />
                </th>
              ))}
            </tr>
            {/* ── Hane seçici satırı (gizlenebilir) ── */}
            {showDigitRow && (
              <tr className="bg-gray-50 border-b border-gray-300">
                {visibleCols.map((c) => {
                  const isDigitCol = isDigitClickCol(c);
                  const tmpl = digitClickTemplate(c);
                  const selPos: number[] = colClickPos[c.id] ?? [];
                  const isHMode = selPos.length === 0;
                  const tmplItems: { ch: string; digitPos: number | null }[] = [];
                  let dIdx = 0;
                  for (const ch of tmpl) {
                    if (/\d/.test(ch)) { dIdx++; tmplItems.push({ ch, digitPos: dIdx }); }
                    else { tmplItems.push({ ch, digitPos: null }); }
                  }
                  return (
                    <th key={c.id} style={{ width: colW(c), minWidth: colW(c), maxWidth: colW(c) }}
                      className="px-0.5 py-0.5 border-r border-gray-300"
                      title="H = tam kod (Enter → sunucu). Rakam kutuları = sabit haneler; tıklanan hücreden ? joker üretilir (Enter → tüm veritabanında ilike).">
                      {isDigitCol ? (
                        <div className="flex items-center gap-px overflow-x-hidden">
                          <button type="button"
                            className={`text-[8px] leading-none px-0.5 py-px rounded border font-bold shrink-0 transition-colors ${isHMode ? "bg-blue-600 border-blue-700 text-white" : "bg-white border-gray-400 text-gray-600 hover:bg-blue-100"}`}
                            onClick={() => setColClickPos((prev) => ({ ...prev, [c.id]: [] }))}
                            title="H: tam değer">H</button>
                          {tmplItems.map((item, ti) =>
                            item.digitPos !== null ? (
                              <button key={ti} type="button"
                                className={`text-[8px] leading-none w-[13px] flex items-center justify-center rounded border shrink-0 transition-colors ${selPos.includes(item.digitPos) ? "bg-green-600 border-green-700 text-white font-bold" : "bg-white border-gray-400 text-gray-600 hover:bg-green-100"}`}
                                onClick={() => setColClickPos((prev) => {
                                  const cur = prev[c.id] ?? [];
                                  const pos = item.digitPos!;
                                  const isSel = cur.includes(pos);
                                  return { ...prev, [c.id]: isSel ? cur.filter((x) => x !== pos) : [...cur, pos].sort((a, b) => a - b) };
                                })}
                                title={`${DIGIT_POS_LABEL[item.digitPos] ?? item.digitPos} (${item.digitPos}. hane)`}>{DIGIT_POS_LABEL[item.digitPos] ?? item.digitPos}</button>
                            ) : (
                              <span key={ti} className="text-[8px] text-gray-400 shrink-0 select-none px-px">{item.ch}</span>
                            )
                          )}
                        </div>
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            )}
            <tr className="bg-gray-200">
              {visibleCols.map((c) => {
                const isDigitCol = isDigitClickCol(c);
                const tmpl = digitClickTemplate(c);
                const selPos: number[] = colClickPos[c.id] ?? [];
                const isHMode = selPos.length === 0;
                const hasColFilterDraft = Boolean((colFilters[c.id] ?? "").trim());
                const hasDigitSel = (colClickPos[c.id]?.length ?? 0) > 0;
                const showClearCol = hasColFilterDraft || hasDigitSel || Boolean(colFiltersCommitted[c.id]?.trim());
                return (
                  <th key={c.id} style={{ width: colW(c), minWidth: colW(c), maxWidth: colW(c) }}
                    className="px-0.5 py-0.5 border-b border-gray-400 border-r border-gray-400">
                    <div className="flex items-center gap-0.5 min-w-0">
                      <input
                        id={`cf-input-${c.id}`}
                        value={colFilters[c.id] ?? ""}
                        onChange={(e) => setColFilters((f) => ({ ...f, [c.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const next = { ...colFilters, [c.id]: (e.target as HTMLInputElement).value };
                            commitColFilters(next);
                          } else if (e.key === "Escape") {
                            const next = { ...colFilters, [c.id]: "" };
                            setColFilters(next);
                            commitColFilters(next);
                          }
                        }}
                        placeholder={(() => {
                          if (!isDigitCol || isHMode || !showDigitRow) return "ara… (Enter)";
                          let dI = 0; let ph = "";
                          for (const ch of tmpl) {
                            if (/\d/.test(ch)) {
                              dI++;
                              ph += selPos.includes(dI) ? (DIGIT_POS_LABEL[dI] ?? "#") : "?";
                            } else { ph += ch; }
                          }
                          // Baştaki ? dizisini * ile kısalt (ör. "????E" → "*E")
                          ph = ph.replace(/^\?+/, "*");
                          return ph + "…";
                        })()}
                        title="Enter → ara | Esc → temizle | *5?6*: wildcard | 4.9+3.2: VEYA"
                        className={`min-w-0 flex-1 bg-gray-100 border rounded px-1 py-0.5 text-[10px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 ${
                          colFiltersCommitted[c.id] ? "border-blue-600" : "border-gray-700"
                        }`}
                      />
                      {showClearCol && (
                        <button
                          type="button"
                          aria-label="Sütun filtresini temizle"
                          title="Bu sütundaki filtreyi ve hane seçimini temizle"
                          className="shrink-0 text-sky-600 hover:text-sky-800 text-[11px] leading-none px-0.5 py-0.5 rounded border border-transparent hover:border-sky-300 hover:bg-sky-50 font-semibold"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = { ...colFilters, [c.id]: "" };
                            setColFilters(next);
                            commitColFilters(next);
                            setColClickPos((prev) => ({ ...prev, [c.id]: [] }));
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={visibleCols.length} className="py-2" /></tr>
            ) : sortedRows.length === 0 ? (
              <tr><td colSpan={visibleCols.length} className="text-center py-16 text-gray-700">Veri yok.</td></tr>
            ) : (
              sortedRows.map((m, ri) => {
                let hitIdx = 0;
                return (
                  <tr key={String(m.id??ri)} className="border-b border-gray-400 hover:bg-white/40 transition-colors">
                    {visibleCols.map((c) => {
                      const val = cellVal(m, c);
                      const suffixForRow =
                        globalKodSuffix ?? rowKodSuffix(m, kodSuffixRefKey, kodSuffixN);
                      // Satır modunda sonek kaynak sütundan türetilir; o sütunun kendi hücresi her zaman eşleşirdi (yanlış tam sarı).
                      const skipRefSourceCol = !globalKodSuffix && c.key === kodSuffixRefKey;
                      const kodSonHit =
                        !skipRefSourceCol &&
                        !!suffixForRow &&
                        shouldScanColForKodSuffix(c) &&
                        cellDigitsEndWith(val, suffixForRow);
                      let cls: string;
                      if (kodSonHit) {
                        cls = "bg-yellow-300/90 text-gray-900 font-semibold";
                      } else if (SCORE_COLS.has(c.id) && val) {
                        cls = "text-green-700 font-semibold";
                      } else if (computeMatchHit(c, m)) {
                        cls = HIT_COLORS[hitIdx++ % 2];
                      } else if (ODDS_GROUPS.has(c.group) && val) {
                        cls = "text-gray-900";
                      } else {
                        cls = "text-gray-900";
                      }
                      return (
                        <td key={c.id} style={{ width: colW(c), minWidth: colW(c), maxWidth: colW(c) }}
                          className={`px-1.5 py-1 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-400 font-mono cursor-pointer ${cls}`}
                          title={val}
                          onClick={() => {
                            if (!val) return;
                            // Hane seçici aktifse seçili pozisyonlara göre wildcard pattern üret
                            const positions = colClickPos[c.id] ?? [];
                            const filterVal =
                              positions.length > 0 && isDigitClickCol(c)
                                ? buildDigitPosPattern(val, positions)
                                : val;
                            const next = { ...colFilters, [c.id]: filterVal };
                            setColFilters(next);
                            commitColFilters(next);
                            // Filtre inputunu odakla & tüm metni seç (düzenlenebilsin)
                            requestAnimationFrame(() => {
                              const el = document.getElementById(`cf-input-${c.id}`) as HTMLInputElement | null;
                              if (el) { el.focus(); el.select(); }
                            });
                          }}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── SAYFALAMA ── */}
      <div className="flex-none flex items-center justify-between px-4 py-2 border-t border-gray-300 bg-gray-300/60 text-xs text-gray-900">
        <span>
          Sayfa {page} / {totalPages||1} · {total.toLocaleString("tr-TR")} maç
          {(Object.values(colFiltersCommitted).some(Boolean) || globalKodSuffix) && ` · filtreli: ${kodSuffixFilteredRows.length}`}
        </span>
        <div className="flex gap-1.5">
          {[
            { label:"««", disabled:page<=1,          action:()=>setPage(1) },
            { label:"‹",  disabled:page<=1,          action:()=>setPage((p)=>p-1) },
            { label:"›",  disabled:page>=totalPages, action:()=>setPage((p)=>p+1) },
            { label:"»»", disabled:page>=totalPages, action:()=>setPage(totalPages) },
          ].map(({ label, disabled, action }) => (
            <button key={label} disabled={disabled} onClick={action}
              className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 disabled:opacity-30 px-2.5 py-1 rounded transition">
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
