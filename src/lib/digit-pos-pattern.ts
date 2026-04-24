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
 * mode="contains"   → baş ve son ? blokları * olur: *09* (herhangi yerde bul, ilike %09%)
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
    result = result.replace(/^[?\s]+/, "*").replace(/[?\s]+$/, "*");
    if (!result.startsWith("*")) result = `*${result}`;
    if (!result.endsWith("*")) result = `${result}*`;
  }
  return result;
}
