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
 * Metin şablonu (######) için "rubber band" pozisyon eşlemesi.
 * Şablonun ilk yarısı değerin başına, son yarısı değerin sonuna çıpalanır.
 * Örnek: şablon N=6, değer M=8 → şablon pos 6 = değer son char.
 *
 * Böylece kullanıcı E (pos 5) ve F (pos 6) kutularını seçince
 * "son iki kutu = son iki harf" olur, isim uzunluğundan bağımsız.
 */
function remapPositionsForText(
  positions: number[],
  N: number, // şablon genişliği
  M: number, // değerdeki ayraç-dışı karakter sayısı
): Set<number> {
  if (M === N) return new Set(positions);
  const half = Math.floor(N / 2);
  const remapped = new Set<number>();
  for (const p of positions) {
    let vp: number;
    if (p <= half) {
      vp = p; // ilk yarı: doğrudan eşle
    } else {
      // son yarı: değerin sonundan say
      // şablon son kutu (N) → değer son char (M); N-1 → M-1; ...
      const fromEnd = N - p; // 0 = son kutu, 1 = sondan ikinci, ...
      vp = M - fromEnd;
    }
    if (vp >= 1 && vp <= M) remapped.add(vp);
  }
  return remapped;
}

/**
 * mode="contains"   → seçilen pozisyonlara göre akıllı joker:
 *   - Seçilmeyen ardışık karakterler (ayraçlar dahil) tek `*` ile özetlenir.
 *   - Başta veya sonda seçilmeyen grup varsa `*` eklenir.
 *   - Örn. D+E (son 2) → *87  |  A+B (ilk 2) → 08*  |  B+C+D → *86*
 *
 * mode="positional" → ? karakterleri olduğu gibi kalır: ?09???? (tam pozisyon eşleşmesi)
 *
 * templateWidth: metin sütunları için (######  → 6) rubber band eşlemesi uygula.
 *   Değer şablondan uzun/kısa olsa bile son N/2 kutu = son N/2 harf olur.
 */
export function buildDigitPosPattern(
  val: string,
  positions: number[],
  mode: DigitPosMode = "contains",
  templateWidth?: number,
): string {
  if (!positions.length) return val;

  // Ayraç-dışı karakter sayısını say (rubber band için)
  let M = 0;
  for (const ch of val) {
    if (!isHaneSeparator(ch)) M++;
  }

  // Rubber band pozisyon eşlemesi (sadece metin şablonları için)
  const posSet: Set<number> =
    templateWidth != null && M > 0 && M !== templateWidth
      ? remapPositionsForText(positions, templateWidth, M)
      : new Set(positions);

  if (mode === "contains") {
    // Ardışık seçilmemiş karakterleri (ayraçlar dahil) tek `*` ile özetle.
    // Bu hem orta boşluklara esneklik verir hem de baş/son `*` ekler.
    let result = "";
    let pendingGap = false; // seçilmemiş karakter/ayraç bekliyor mu

    let haneIdx = 0;
    for (const ch of val) {
      if (!isHaneSeparator(ch)) {
        haneIdx++;
        if (posSet.has(haneIdx)) {
          if (pendingGap) {
            result += "*";
            pendingGap = false;
          }
          result += ch;
        } else {
          pendingGap = true;
        }
      } else {
        // Ayraç: en az bir seçili karakter geldikten sonra boşluk grubuna dahil et
        if (result.length > 0) pendingGap = true;
        // Başta gelen ayraçlar (pendingGap=false, result="") → öncü boşluğa dahil olur
        // Bunlar baştaki seçilmemiş kümesiyle birleşince zaten leading `*` eklenecek
        else pendingGap = true; // leading separator → mark as gap
      }
    }
    if (pendingGap) result += "*";
    if (!result) return "*";
    return result;
  } else {
    // positional: ? karakterleri olduğu gibi
    let result = "";
    let haneIdx = 0;
    for (const ch of val) {
      if (!isHaneSeparator(ch)) {
        haneIdx++;
        result += posSet.has(haneIdx) ? ch : "?";
      } else {
        result += ch;
      }
    }
    return result;
  }
}

/**
 * Verilen şablon dizisi metin sütunu şablonuysa (yalnızca '#' ve uzunluk 6)
 * rubber band genişliğini döndürür, değilse undefined.
 */
export function textTemplateBandingWidth(templateStr: string): number | undefined {
  return /^#{6}$/.test(templateStr) ? 6 : undefined;
}
