/**
 * OKBT bağlamında 5 basamaklı oyun kodu ABCDE için “Oyun Basamak Kodu Toplamları”.
 * Kaynak: IY Kodu (`kod_iy`) — en az 5 rakam; daha uzunsa son 5 rakam kullanılır.
 */

export const OKBT_BASAMAK_GROUP = "Oyun Basamak Kodu Toplamları";

/** Sütun başlıkları (ABCDE = kodun 1–5. basamağı).
 *  0–14: 3'lü (10) + 4'lü (4) + 5'li (1) — mevcut (DB stored)
 * 15–24: 2'li (10) — yeni
 *     25: eksik 4'lü A+C+D+E — yeni
 */
export const OKBT_BASAMAK_LABELS = [
  // 3'lü (idx 0–9)
  "A+B+E", "A+C+E", "A+D+E", "A+B+D", "A+C+D",
  "A+B+C", "B+D+E", "B+C+E", "B+C+D", "C+D+E",
  // 4'lü (idx 10–13)
  "A+B+C+E", "A+B+D+E", "A+B+C+D", "B+C+D+E",
  // 5'li (idx 14)
  "A+B+C+D+E",
  // 2'li (idx 15–24)
  "A+B", "A+C", "A+D", "A+E", "B+C", "B+D", "B+E", "C+D", "C+E", "D+E",
  // Eksik 4'lü (idx 25)
  "A+C+D+E",
] as const;

/** IY kodundan A,B,C,D,E (0–9).
 *  Kod 5 rakamdan kısaysa eksik pozisyonlar (D, E) sıfır sayılır;
 *  5'ten uzunsa son 5 rakam alınır. */
export function parseIyKodBesBasamak(kodRaw: unknown): [number, number, number, number, number] | null {
  const digits = String(kodRaw ?? "").replace(/\D/g, "");
  if (digits.length < 1) return null;
  // 5'ten uzunsa son 5 rakam; kısaysa SOLDAN sıfır doldurup 5'e tamamla (eksik basamaklar A, B… → 0)
  // Örn: "48" → "00048" → A=0 B=0 C=0 D=4 E=8
  const d = digits.length >= 5 ? digits.slice(-5) : digits.padStart(5, "0");
  const a = Number(d[0]);
  const b = Number(d[1]);
  const c = Number(d[2]);
  const d3 = Number(d[3]);
  const e = Number(d[4]);
  if ([a, b, c, d3, e].some((n) => !Number.isFinite(n))) return null;
  return [a, b, c, d3, e];
}

/** 26 toplam; kod geçersizse null. */
export function okbtOyunBasamakToplamlari(kodRaw: unknown): number[] | null {
  const p = parseIyKodBesBasamak(kodRaw);
  if (!p) return null;
  const [A, B, C, D, E] = p;
  return [
    // 3'lü (0–9)
    A + B + E, A + C + E, A + D + E, A + B + D, A + C + D,
    A + B + C, B + D + E, B + C + E, B + C + D, C + D + E,
    // 4'lü (10–13)
    A + B + C + E, A + B + D + E, A + B + C + D, B + C + D + E,
    // 5'li (14)
    A + B + C + D + E,
    // 2'li (15–24)
    A + B, A + C, A + D, A + E, B + C, B + D, B + E, C + D, C + E, D + E,
    // Eksik 4'lü (25)
    A + C + D + E,
  ];
}

export function okbtBasamakHucreDegeri(kodRaw: unknown, index: number): string {
  const sums = okbtOyunBasamakToplamlari(kodRaw);
  if (!sums || index < 0 || index >= sums.length) return "";
  return String(sums[index]);
}

// ── 7 basamaklı (Maç ID ABCDEFG) ───────────────────────────────────────────

/** Sütun başlıkları: 7 haneli ID (A–G) için tüm kombinasyonlar — itertools sırası.
 * 2'li (21, idx 0–20) → 3'lü (35, 21–55) → 4'lü (35, 56–90) → 5'li (21, 91–111) → 6'lı (7, 112–118)
 * Toplam: 119 kombinasyon
 */
export const OKBT_7_BASAMAK_LABELS = [
  // 2'li (21 adet, idx 0-20)
  "A+B", "A+C", "A+D", "A+E", "A+F", "A+G",
  "B+C", "B+D", "B+E", "B+F", "B+G",
  "C+D", "C+E", "C+F", "C+G",
  "D+E", "D+F", "D+G",
  "E+F", "E+G", "F+G",
  // 3'lü (35 adet, idx 21-55)
  "A+B+C", "A+B+D", "A+B+E", "A+B+F", "A+B+G",
  "A+C+D", "A+C+E", "A+C+F", "A+C+G",
  "A+D+E", "A+D+F", "A+D+G",
  "A+E+F", "A+E+G", "A+F+G",
  "B+C+D", "B+C+E", "B+C+F", "B+C+G",
  "B+D+E", "B+D+F", "B+D+G",
  "B+E+F", "B+E+G", "B+F+G",
  "C+D+E", "C+D+F", "C+D+G",
  "C+E+F", "C+E+G", "C+F+G",
  "D+E+F", "D+E+G", "D+F+G", "E+F+G",
  // 4'lü (35 adet, idx 56-90)
  "A+B+C+D", "A+B+C+E", "A+B+C+F", "A+B+C+G",
  "A+B+D+E", "A+B+D+F", "A+B+D+G",
  "A+B+E+F", "A+B+E+G", "A+B+F+G",
  "A+C+D+E", "A+C+D+F", "A+C+D+G",
  "A+C+E+F", "A+C+E+G", "A+C+F+G",
  "A+D+E+F", "A+D+E+G", "A+D+F+G", "A+E+F+G",
  "B+C+D+E", "B+C+D+F", "B+C+D+G",
  "B+C+E+F", "B+C+E+G", "B+C+F+G",
  "B+D+E+F", "B+D+E+G", "B+D+F+G", "B+E+F+G",
  "C+D+E+F", "C+D+E+G", "C+D+F+G", "C+E+F+G", "D+E+F+G",
  // 5'li (21 adet, idx 91-111)
  "A+B+C+D+E", "A+B+C+D+F", "A+B+C+D+G",
  "A+B+C+E+F", "A+B+C+E+G", "A+B+C+F+G",
  "A+B+D+E+F", "A+B+D+E+G", "A+B+D+F+G", "A+B+E+F+G",
  "A+C+D+E+F", "A+C+D+E+G", "A+C+D+F+G", "A+C+E+F+G", "A+D+E+F+G",
  "B+C+D+E+F", "B+C+D+E+G", "B+C+D+F+G", "B+C+E+F+G", "B+D+E+F+G", "C+D+E+F+G",
  // 6'lı (7 adet, idx 112-118)
  "A+B+C+D+E+F", "A+B+C+D+E+G", "A+B+C+D+F+G",
  "A+B+C+E+F+G", "A+B+D+E+F+G", "A+C+D+E+F+G", "B+C+D+E+F+G",
] as const;

export const OKBT_7_IDX_COUNT = OKBT_7_BASAMAK_LABELS.length; // 119

function parseKod7Basamak(kodRaw: unknown): [number,number,number,number,number,number,number] | null {
  const digits = String(kodRaw ?? "").replace(/\D/g, "");
  if (digits.length < 1) return null;
  const d = digits.length >= 7 ? digits.slice(-7) : digits.padStart(7, "0");
  const ns = d.split("").map(Number);
  if (ns.some((n) => !Number.isFinite(n))) return null;
  return ns as unknown as [number,number,number,number,number,number,number];
}

export function okbt7BasamakToplamlari(kodRaw: unknown): number[] | null {
  const p = parseKod7Basamak(kodRaw);
  if (!p) return null;
  const [A,B,C,D,E,F,G] = p;
  return [
    // 2'li (idx 0-20)
    A+B, A+C, A+D, A+E, A+F, A+G,
    B+C, B+D, B+E, B+F, B+G,
    C+D, C+E, C+F, C+G,
    D+E, D+F, D+G,
    E+F, E+G, F+G,
    // 3'lü (idx 21-55)
    A+B+C, A+B+D, A+B+E, A+B+F, A+B+G,
    A+C+D, A+C+E, A+C+F, A+C+G,
    A+D+E, A+D+F, A+D+G,
    A+E+F, A+E+G, A+F+G,
    B+C+D, B+C+E, B+C+F, B+C+G,
    B+D+E, B+D+F, B+D+G,
    B+E+F, B+E+G, B+F+G,
    C+D+E, C+D+F, C+D+G,
    C+E+F, C+E+G, C+F+G,
    D+E+F, D+E+G, D+F+G, E+F+G,
    // 4'lü (idx 56-90)
    A+B+C+D, A+B+C+E, A+B+C+F, A+B+C+G,
    A+B+D+E, A+B+D+F, A+B+D+G,
    A+B+E+F, A+B+E+G, A+B+F+G,
    A+C+D+E, A+C+D+F, A+C+D+G,
    A+C+E+F, A+C+E+G, A+C+F+G,
    A+D+E+F, A+D+E+G, A+D+F+G, A+E+F+G,
    B+C+D+E, B+C+D+F, B+C+D+G,
    B+C+E+F, B+C+E+G, B+C+F+G,
    B+D+E+F, B+D+E+G, B+D+F+G, B+E+F+G,
    C+D+E+F, C+D+E+G, C+D+F+G, C+E+F+G, D+E+F+G,
    // 5'li (idx 91-111)
    A+B+C+D+E, A+B+C+D+F, A+B+C+D+G,
    A+B+C+E+F, A+B+C+E+G, A+B+C+F+G,
    A+B+D+E+F, A+B+D+E+G, A+B+D+F+G, A+B+E+F+G,
    A+C+D+E+F, A+C+D+E+G, A+C+D+F+G, A+C+E+F+G, A+D+E+F+G,
    B+C+D+E+F, B+C+D+E+G, B+C+D+F+G, B+C+E+F+G, B+D+E+F+G, C+D+E+F+G,
    // 6'lı (idx 112-118)
    A+B+C+D+E+F, A+B+C+D+E+G, A+B+C+D+F+G,
    A+B+C+E+F+G, A+B+D+E+F+G, A+C+D+E+F+G, B+C+D+E+F+G,
  ];
}

export function okbt7BasamakHucreDegeri(kodRaw: unknown, index: number): string {
  const sums = okbt7BasamakToplamlari(kodRaw);
  if (!sums || index < 0 || index >= sums.length) return "";
  return String(sums[index]);
}
