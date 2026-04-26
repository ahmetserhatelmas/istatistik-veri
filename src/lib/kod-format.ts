/**
 * Maç kodu (id) 7 hane; MS/İY/ÇŞ/AÜ kodları 5 hane — gösterim ve saf rakam filtre girişi.
 */

export const FIVE_DIGIT_KOD_COL_IDS = new Set(["kod_ms", "kod_iy", "kod_cs", "kod_au"]);

const MAÇ_KODU_COL_ID = "id";
const MAÇ_KODU_PAD = 7;
const OYUN_KODU_PAD = 5;

/**
 * Kullanıcı `*` ile başlatınca "içerir" yerine kod hanesine soldan 0 pad uygula.
 * Örn (7 hane): *?? -> 00000??, (5 hane): *3245 -> 03245
 */
function normalizeLeadingStarPadInput(v: string, pad: number): string {
  const t = v.trim();
  if (!t.startsWith("*")) return t;
  const rest = t.slice(1).trim();
  if (!rest) return t;
  // OR/AND karmaşık ifadelerde mevcut semantiği bozmayalım.
  if (rest.includes("*") || rest.includes(",") || rest.includes("+")) return t;
  // Yalnız kod deseni karakterleri: rakam ve '?'.
  if (!/^[\d?]+$/.test(rest)) return t;
  if (rest.length > pad) return t;
  return rest.padStart(pad, "0");
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
  const pad = PAD_BY_COL[colId] ?? (/[_]obktb_\d+$/i.test(colId) ? 2 : 0);
  if (!pad) return v.trim();
  const t = v.trim();
  const qOnlyPad = normalizeQuestionOnlyPadInput(t, pad);
  if (qOnlyPad !== t) return qOnlyPad;
  const starPad = normalizeLeadingStarPadInput(t, pad);
  if (starPad !== t) return starPad;
  return t;
}

/** Tablo hücresi: oyun kodu sütunlarında soldan sıfır doldur. */
export function padFiveDigitKodDisplay(raw: unknown): string {
  if (raw == null || raw === "") return "";
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/\D/g, ""));
  if (!Number.isFinite(n)) return String(raw).trim();
  const s = String(Math.abs(Math.round(n)));
  return s.length < OYUN_KODU_PAD ? s.padStart(OYUN_KODU_PAD, "0") : s;
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
 * Ham veri KOD* hücresi: yalnızca saf rakam ve 5’ten kısaysa doldur.
 * Skor kodu (KODHMS…) 8 hane — burada dokunulmaz, ayrı şablon kullanılır.
 */
export function padRawKodNumericDisplay(rawKey: string, raw: unknown): string | null {
  const U = rawKey.trim().toUpperCase();
  if (!/^KOD/.test(U) || /^KODHMS/.test(U)) return null;
  if (raw == null || raw === "") return "";
  const t = String(raw).trim();
  if (!/^\d+$/.test(t)) return null;
  return t.length < OYUN_KODU_PAD ? t.padStart(OYUN_KODU_PAD, "0") : t;
}

/** cf_* değeri: yalnız rakam ve 1–4 hane ise 5 haneye tamamla (API ile uyumlu arama). */
export function normalizeFiveDigitPureFilterInput(v: string): string {
  const t = v.trim();
  const qOnlyPad = normalizeQuestionOnlyPadInput(t, OYUN_KODU_PAD);
  if (qOnlyPad !== t) return qOnlyPad;
  const starPad = normalizeLeadingStarPadInput(t, OYUN_KODU_PAD);
  if (starPad !== t) return starPad;
  if (!/^\d+$/.test(t) || t.length >= OYUN_KODU_PAD) return t;
  return t.padStart(OYUN_KODU_PAD, "0");
}

/** Maç kodu (id) filtresi: 1–6 hane saf rakam → 7 haneye tamamla. */
export function normalizeSevenDigitIdPureFilterInput(v: string): string {
  const t = v.trim();
  const qOnlyPad = normalizeQuestionOnlyPadInput(t, MAÇ_KODU_PAD);
  if (qOnlyPad !== t) return qOnlyPad;
  const starPad = normalizeLeadingStarPadInput(t, MAÇ_KODU_PAD);
  if (starPad !== t) return starPad;
  if (!/^\d+$/.test(t) || t.length >= MAÇ_KODU_PAD) return t;
  return t.padStart(MAÇ_KODU_PAD, "0");
}

export function isCfColIdFiveDigitKod(colId: string): boolean {
  return FIVE_DIGIT_KOD_COL_IDS.has(colId);
}

export function isCfColIdMatchCodeId(colId: string): boolean {
  return colId === MAÇ_KODU_COL_ID;
}

/** Ham veri: skor kodu şablonu 8 hane (KODHMS…). */
export function isRawSkorKodEightKey(key: string): boolean {
  return /^KODHMS/i.test(key.trim());
}

/** Ham veri anahtarı: KOD* ve 5 hane pad mantığı (KODHMS hariç) — sunucu joker ön-filtresi. */
export function isRawFiveDigitPaddedKodJsonKey(key: string): boolean {
  const U = key.trim().toUpperCase();
  return /^KOD/.test(U) && !/^KODHMS/.test(U);
}

/** Ham veri sütun id: raw_<jsonKey> — saf rakam KOD (KODHMS hariç) için 5 hane tamamlama. */
export function normalizeRawKodCfValue(colId: string, v: string): string {
  if (!colId.startsWith("raw_")) return v;
  const key = colId.slice(4);
  const U = key.toUpperCase();
  if (!/^KOD/.test(U) || /^KODHMS/.test(U)) return v;
  const t = v.trim();
  const qOnlyPad = normalizeQuestionOnlyPadInput(t, OYUN_KODU_PAD);
  if (qOnlyPad !== t) return qOnlyPad;
  const starPad = normalizeLeadingStarPadInput(t, OYUN_KODU_PAD);
  if (starPad !== t) return starPad;
  if (!/^\d+$/.test(t) || t.length >= OYUN_KODU_PAD) return v;
  return t.padStart(OYUN_KODU_PAD, "0");
}
