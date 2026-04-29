/**
 * Hane (⊞) pozisyon desenleri — MatchTable ve Akıllı Filtre ortak.
 * Ayraçlar pozisyon saymaz; seçili haneler sabit, diğerleri ? veya * ile joker.
 */

const HANE_SEPARATORS = new Set([".", ":", "-", "/", ",", " ", "(", ")", "_", "'"]);

export function isHaneSeparator(ch: string): boolean {
  return HANE_SEPARATORS.has(ch);
}

export type DigitPosMode = "contains" | "positional";

/**
 * mode="contains"   → seçilen pozisyonlara göre akıllı joker:
 *   - Baş pozisyonlar seçilmemişse leading `*` eklenir  (*09)
 *   - Son pozisyonlar seçilmemişse trailing `*` eklenir  (09*)
 *   - Her iki uç da seçilmemişse her ikisi de eklenir    (*09*)
 *   - D+E (son 2 hane) → *87  |  A+B (ilk 2 hane) → 08*  |  B+C+D → *86*
 * mode="positional" → ? karakterleri olduğu gibi kalır: ?09???? (tam pozisyon eşleşmesi)
 */
export function buildDigitPosPattern(
  val: string,
  positions: number[],
  mode: DigitPosMode = "contains",
): string {
  if (!positions.length) return val;
  const posSet = new Set(positions);
  let haneIdx = 0;
  let result = "";
  for (const ch of val) {
    if (!isHaneSeparator(ch)) {
      haneIdx++;
      result += posSet.has(haneIdx) ? ch : "?";
    } else {
      result += ch;
    }
  }
  if (mode === "contains") {
    // Baş veya sondaki seçilmemiş (`?`) haneler varsa o tarafa `*` ekle;
    // yoksa wildcard ekleme (prefix / suffix / exact arama).
    const hadLeadingQ = /^[?\s]/.test(result);
    const hadTrailingQ = /[?\s]$/.test(result);
    result = result.replace(/^[?\s]+/, "").replace(/[?\s]+$/, "");
    if (!result) return "*";
    if (hadLeadingQ) result = "*" + result;
    if (hadTrailingQ) result = result + "*";
  }
  return result;
}
