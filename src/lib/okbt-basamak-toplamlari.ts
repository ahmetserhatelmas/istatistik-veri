/**
 * OKBT bağlamında 5 basamaklı oyun kodu ABCDE için “Oyun Basamak Kodu Toplamları”.
 * Kaynak: IY Kodu (`kod_iy`) — en az 5 rakam; daha uzunsa son 5 rakam kullanılır.
 */

export const OKBT_BASAMAK_GROUP = "Oyun Basamak Kodu Toplamları";

/** Sütun başlıkları (ABCDE = kodun 1–5. basamağı). */
export const OKBT_BASAMAK_LABELS = [
  "A+B+E",
  "A+C+E",
  "A+D+E",
  "A+B+D",
  "A+C+D",
  "A+B+C",
  "B+D+E",
  "B+C+E",
  "B+C+D",
  "C+D+E",
  "A+B+C+E",
  "A+B+D+E",
  "A+B+C+D",
  "B+C+D+E",
  "A+B+C+D+E",
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

/** 15 toplam; kod geçersizse null. */
export function okbtOyunBasamakToplamlari(kodRaw: unknown): number[] | null {
  const p = parseIyKodBesBasamak(kodRaw);
  if (!p) return null;
  const [A, B, C, D, E] = p;
  return [
    A + B + E,
    A + C + E,
    A + D + E,
    A + B + D,
    A + C + D,
    A + B + C,
    B + D + E,
    B + C + E,
    B + C + D,
    C + D + E,
    A + B + C + E,
    A + B + D + E,
    A + B + C + D,
    B + C + D + E,
    A + B + C + D + E,
  ];
}

export function okbtBasamakHucreDegeri(kodRaw: unknown, index: number): string {
  const sums = okbtOyunBasamakToplamlari(kodRaw);
  if (!sums || index < 0 || index >= sums.length) return "";
  return String(sums[index]);
}

// ── 7 basamaklı (Maç ID ABCDEFG) ───────────────────────────────────────────

/** Sütun başlıkları: 7 haneli ID için A–G kombinasyonları (20 adet). */
export const OKBT_7_BASAMAK_LABELS = [
  // 3-toplam: A/B + X + G
  "A+B+G", "A+C+G", "A+D+G", "A+E+G", "A+F+G",
  // 3-toplam: ardışık orta/son
  "B+C+D", "B+D+E", "C+D+E", "D+E+F", "E+F+G",
  // 4-toplam: ardışık pencereler
  "A+B+C+D", "B+C+D+E", "C+D+E+F", "D+E+F+G",
  // 5-toplam
  "A+B+C+D+E", "B+C+D+E+F", "C+D+E+F+G",
  // 6-toplam
  "A+B+C+D+E+F", "B+C+D+E+F+G",
  // 7-toplam
  "A+B+C+D+E+F+G",
] as const;

export const OKBT_7_IDX_COUNT = OKBT_7_BASAMAK_LABELS.length; // 20

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
    A+B+G, A+C+G, A+D+G, A+E+G, A+F+G,
    B+C+D, B+D+E, C+D+E, D+E+F, E+F+G,
    A+B+C+D, B+C+D+E, C+D+E+F, D+E+F+G,
    A+B+C+D+E, B+C+D+E+F, C+D+E+F+G,
    A+B+C+D+E+F, B+C+D+E+F+G,
    A+B+C+D+E+F+G,
  ];
}

export function okbt7BasamakHucreDegeri(kodRaw: unknown, index: number): string {
  const sums = okbt7BasamakToplamlari(kodRaw);
  if (!sums || index < 0 || index >= sums.length) return "";
  return String(sums[index]);
}
