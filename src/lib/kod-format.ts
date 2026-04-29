import { normalizeOkbtCfInput } from "./okbt-wildcard-server-expand";

/**
 * Maç kodu (id) 7 hane = ABCDEFG (OKBT); oyun kodları 5 “hane” = A–E basamakları (OKBT ile aynı);
 * şema ID sütunları görünümde 5 rakama soldan tamamlanır (kesilmez); ham KODSK 8 hane.
 */

export const FIVE_DIGIT_KOD_COL_IDS = new Set(["kod_ms", "kod_iy", "kod_cs", "kod_au"]);

const MAÇ_KODU_COL_ID = "id";
const MAÇ_KODU_PAD = 7;
/** Oyun kodu ABCDE: 5 basamak — `okbt-basamak-toplamlari.parseIyKodBesBasamak` ile aynı kural. */
const OYUN_KODU_PAD = 5;
const KODSK_PAD = 8;

/** Saf rakam dizisi → sabit genişlik: uzunsa son N, kısaysa soldan 0 (oyun kodu / KODSK gösterimi). */
function normalizeDigitRunToFixedWidth(t: string, width: number): string {
  if (t.length > width) return t.slice(-width);
  if (t.length < width) return t.padStart(width, "0");
  return t;
}

/** * ardından boşluksuz 1–2 haneli saf rakam: yalnızca sonek joker (*6, *23); boşluksuz * ile aynı sonek yolu. */
function isShortDigitSuffixAfterStar(t: string): boolean {
  const s = t.trim();
  if (!s.startsWith("*")) return false;
  const after = s.slice(1);
  if (after.includes(" ") || after.includes("?")) return false;
  return /^\d+$/.test(after) && after.length <= 2;
}

/**
 * Sabit genişlik: yalnızca `*` sonrası **boşluklar** açık baş sıfır sayısı (`* 8528` → `08528`, 5 hane).
 * Boşluksuz `*34`, `*482?` vb. **genişletilmez** — sonek arama olarak kalır (`*` → SQL `%`).
 */
function expandLeadingStarFixedWidth(t: string, width: number): string | null {
  const s = t.trim();
  if (!s.startsWith("*")) return null;
  if (isShortDigitSuffixAfterStar(s)) return null;
  const afterStar = s.slice(1);
  if (afterStar.includes("*") || afterStar.includes(",") || afterStar.includes("+")) return null;
  let i = 0;
  let spaceZeros = 0;
  while (i < afterStar.length && afterStar[i] === " ") {
    spaceZeros++;
    i++;
  }
  const body = afterStar.slice(i).replace(/\s/g, "");
  if (spaceZeros === 0) return null;
  if (body.length === 0) return null;
  if (!/^[0-9?]+$/.test(body)) return null;
  if (spaceZeros + body.length !== width) return null;
  return "0".repeat(spaceZeros) + body;
}

/** Yalnız `?` girildiyse (örn. ???) kod genişliğine soldan 0 pad uygula. */
function normalizeQuestionOnlyPadInput(v: string, pad: number): string {
  const t = v.trim();
  if (!/^\?+$/.test(t)) return t;
  if (t.length > pad) return t;
  return t.padStart(pad, "0");
}

/** Uygun kod sütunları için `?` / `*` başı pad normalizasyonu (4* gibi prefix'i bozmaz). */
export function normalizeFixedWidthCodeFilterInput(colId: string, v: string): string {
  const PAD_BY_COL: Record<string, number> = {
    id: MAÇ_KODU_PAD,
    kod_ms: OYUN_KODU_PAD,
    kod_iy: OYUN_KODU_PAD,
    kod_cs: OYUN_KODU_PAD,
    kod_au: OYUN_KODU_PAD,
    // 2 haneli kod benzeri sütunlar
    mbs: 2,
    suffix3: 2,
  };
  const pad =
    PAD_BY_COL[colId] ??
    cfColFixedDigitWidth(colId) ??
    (/[_]obktb_\d+$/i.test(colId) ? 2 : 0);
  if (!pad) return v.trim();
  const t = v.trim();
  const qOnlyPad = normalizeQuestionOnlyPadInput(t, pad);
  if (qOnlyPad !== t) return qOnlyPad;
  const expanded = expandLeadingStarFixedWidth(t, pad);
  if (expanded !== null) return expanded;
  return t;
}

/** Tablo hücresi: oyun kodu (ABCDE) — kısaysa soldan 0, 5’ten uzunsa son 5 rakam (OKBT ile uyumlu). */
export function padFiveDigitKodDisplay(raw: unknown): string {
  if (raw == null || raw === "") return "";
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return String(raw).trim();
  return normalizeDigitRunToFixedWidth(digits, OYUN_KODU_PAD);
}

/** Maç kodu (id) gösterimi — mevcut davranışla uyumlu 7 hane. */
export function padSevenDigitMatchIdDisplay(raw: unknown): string {
  if (raw == null || raw === "") return "";
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return String(raw).trim();
  const s = String(Math.abs(Math.round(n)));
  return s.length <= MAÇ_KODU_PAD ? s.padStart(MAÇ_KODU_PAD, "0") : s;
}

/**
 * Ham veri KOD* hücresi: saf rakam ise KODSK → 8 basamak (uzunsa sondan 8); diğer KOD* → ABCDE 5 basamak.
 * KODHMS* gösterimi padlenmez (eskisi gibi null → ham metin).
 */
export function padRawKodNumericDisplay(rawKey: string, raw: unknown): string | null {
  const U = rawKey.trim().toUpperCase();
  if (!/^KOD/.test(U) || /^KODHMS/.test(U)) return null;
  if (raw == null || raw === "") return "";
  const t = String(raw).trim();
  if (!/^\d+$/.test(t)) return null;
  const w = U === "KODSK" ? KODSK_PAD : OYUN_KODU_PAD;
  return normalizeDigitRunToFixedWidth(t, w);
}

/**
 * Maç kodu dışındaki şema ID sütunları — ABCDE değil; yalnız kısa saf rakamları 5 haneye soldan tamamlar (kesilmez).
 */
export const PAD_ID_COL_IDS = new Set<string>([
  "lig_id",
  "alt_lig_id",
  "sezon_id",
  "t1i",
  "t2i",
]);

/** Saf rakam değeri verilen hedef genişliğe soldan 0 ile doldur; rakam değilse olduğu gibi döndür. */
export function padIdNumericDisplay(raw: unknown, targetWidth: number): string {
  if (raw == null || raw === "") return "";
  const t =
    typeof raw === "number"
      ? String(Math.abs(Math.round(raw)))
      : String(raw).trim();
  if (!/^\d+$/.test(t)) return t;
  if (targetWidth <= 0) return t;
  return t.length < targetWidth ? t.padStart(targetWidth, "0") : t;
}

/**
 * cf_* sabit genişlik (ABCDE=5, maç kodu=7, KODSK/KODHMS=8, şema ID=5).
 * Ham veri: yalnız KOD* / KODSK / KODHMS; diğer raw_* için null.
 */
export function cfColFixedDigitWidth(colId: string): number | null {
  if (colId === MAÇ_KODU_COL_ID) return MAÇ_KODU_PAD;
  if (FIVE_DIGIT_KOD_COL_IDS.has(colId)) return OYUN_KODU_PAD;
  if (PAD_ID_COL_IDS.has(colId)) return OYUN_KODU_PAD;
  if (!colId.startsWith("raw_")) return null;
  const key = colId.slice(4);
  const pl = rawKodJsonWildcardPadLen(key);
  if (pl !== null) return pl;
  if (isRawEightDigitKodJsonKey(key)) return KODSK_PAD;
  return null;
}

/**
 * Ham veri KOD*: joker / RPC pad uzunluğu (KODHMS = ham metin, pad yok → null).
 */
export function rawKodJsonWildcardPadLen(key: string): number | null {
  const U = key.trim().toUpperCase();
  if (!/^KOD/.test(U) || /^KODHMS/.test(U)) return null;
  if (U === "KODSK") return KODSK_PAD;
  return OYUN_KODU_PAD;
}

/** Ham veri: KODHMS… veya KODSK — gösterim / hane şablonu 8 karakter. */
export function isRawEightDigitKodJsonKey(key: string): boolean {
  const U = key.trim().toUpperCase();
  return /^KODHMS/.test(U) || U === "KODSK";
}

/** cf_* değeri: yalnız rakam ve 1–4 hane ise 5 haneye tamamla (API ile uyumlu arama). */
export function normalizeFiveDigitPureFilterInput(v: string): string {
  const t = v.trim();
  const qOnlyPad = normalizeQuestionOnlyPadInput(t, OYUN_KODU_PAD);
  if (qOnlyPad !== t) return qOnlyPad;
  if (!/^\d+$/.test(t) || t.length >= OYUN_KODU_PAD) return t;
  return t.padStart(OYUN_KODU_PAD, "0");
}

/** Maç kodu (id) filtresi: 1–6 hane saf rakam → 7 haneye tamamla. */
export function normalizeSevenDigitIdPureFilterInput(v: string): string {
  const t = v.trim();
  const qOnlyPad = normalizeQuestionOnlyPadInput(t, MAÇ_KODU_PAD);
  if (qOnlyPad !== t) return qOnlyPad;
  if (!/^\d+$/.test(t) || t.length >= MAÇ_KODU_PAD) return t;
  return t.padStart(MAÇ_KODU_PAD, "0");
}

export function isCfColIdFiveDigitKod(colId: string): boolean {
  return FIVE_DIGIT_KOD_COL_IDS.has(colId);
}

/**
 * Hane seçimi (⊞) için referans değeri, sütunun şablon genişliğine pad eder.
 * Örnek: kod_ms "8687" → "08687" (5 hane), id "2830731" → "2830731" (7 hane).
 * Böylece [4,5] pozisyonları "son 2 hane" olarak doğru çalışır.
 */
export function padValueForDigitPattern(colId: string, raw: string): string {
  if (FIVE_DIGIT_KOD_COL_IDS.has(colId)) return padFiveDigitKodDisplay(raw);
  if (colId === MAÇ_KODU_COL_ID) return padSevenDigitMatchIdDisplay(raw);
  if (PAD_ID_COL_IDS.has(colId)) return padIdNumericDisplay(raw, OYUN_KODU_PAD);
  return raw;
}

export function isCfColIdMatchCodeId(colId: string): boolean {
  return colId === MAÇ_KODU_COL_ID;
}

/** Ham veri: skor kodu şablonu 8 hane (KODHMS…). */
export function isRawSkorKodEightKey(key: string): boolean {
  return /^KODHMS/i.test(key.trim());
}

/** Ham veri anahtarı: KOD* pad’li joker / RPC (KODHMS hariç; KODSK 8, diğer KOD* 5). */
export function isRawFiveDigitPaddedKodJsonKey(key: string): boolean {
  return rawKodJsonWildcardPadLen(key) !== null;
}

/**
 * Ham veri sütun id: raw_<jsonKey> — saf rakam KOD (KODHMS hariç) için pad: KODSK 8, diğer KOD* 5.
 * `*` / `?` içeren girdiyi olduğu gibi bırak: API’de padlenmiş metin üzerinde `%…` sonek jokeri
 * (`*6` → sonu 6) uygulanır.
 */
export function normalizeRawKodCfValue(colId: string, v: string): string {
  if (!colId.startsWith("raw_")) return v;
  const key = colId.slice(4);
  const U = key.toUpperCase();
  if (!/^KOD/.test(U) || /^KODHMS/.test(U)) return v;
  const t = v.trim();
  const padLen = U === "KODSK" ? KODSK_PAD : OYUN_KODU_PAD;
  const qOnlyPad = normalizeQuestionOnlyPadInput(t, padLen);
  if (qOnlyPad !== t) return qOnlyPad;
  if (!/^\d+$/.test(t) || t.length >= padLen) return v;
  return t.padStart(padLen, "0");
}

/**
 * Tarayıcı `cf_*` gönderimi ve API tarafı için ortak sıra:
 * `* 8528` → boşluk sayısı kadar başa 0 → `08528` (sabit genişlik).
 * Boşluksuz `*34`, `*482?` → olduğu gibi (`*` → `%` sonek arama); saf rakam kısa girdi → pad.
 */
export function normalizeCfPipelineBeforeApi(colId: string, v: string): string {
  let out = normalizeFixedWidthCodeFilterInput(colId, v);
  if (FIVE_DIGIT_KOD_COL_IDS.has(colId)) out = normalizeFiveDigitPureFilterInput(out);
  else if (isCfColIdMatchCodeId(colId)) out = normalizeSevenDigitIdPureFilterInput(out);
  else if (colId.startsWith("raw_")) out = normalizeRawKodCfValue(colId, out);
  else if (/^[a-z][a-z0-9]*_obktb_\d+$/i.test(colId)) out = normalizeOkbtCfInput(out);
  return out;
}
