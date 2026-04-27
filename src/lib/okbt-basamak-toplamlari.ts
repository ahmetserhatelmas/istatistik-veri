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

/** Sütun başlıkları: 7 haneli ID için A–G kombinasyonları.
 *  0–19: mevcut curated seçim (3–7'li)
 * 20–40: tüm 2'li kombinasyonlar (21 adet) — yeni
 */
export const OKBT_7_BASAMAK_LABELS = [
  // 3-toplam: A/B + X + G (0–4)
  "A+B+G", "A+C+G", "A+D+G", "A+E+G", "A+F+G",
  // 3-toplam: ardışık orta/son (5–9)
  "B+C+D", "B+D+E", "C+D+E", "D+E+F", "E+F+G",
  // 4-toplam: ardışık pencereler (10–13)
  "A+B+C+D", "B+C+D+E", "C+D+E+F", "D+E+F+G",
  // 5-toplam (14–16)
  "A+B+C+D+E", "B+C+D+E+F", "C+D+E+F+G",
  // 6-toplam (17–18)
  "A+B+C+D+E+F", "B+C+D+E+F+G",
  // 7-toplam (19)
  "A+B+C+D+E+F+G",
  // 2'li: tüm C(7,2)=21 kombinasyon (20–40)
  "A+B", "A+C", "A+D", "A+E", "A+F", "A+G",
  "B+C", "B+D", "B+E", "B+F", "B+G",
  "C+D", "C+E", "C+F", "C+G",
  "D+E", "D+F", "D+G",
  "E+F", "E+G",
  "F+G",
] as const;

export const OKBT_7_IDX_COUNT = OKBT_7_BASAMAK_LABELS.length; // 41

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
    // Mevcut curated seçim (0–19)
    A+B+G, A+C+G, A+D+G, A+E+G, A+F+G,
    B+C+D, B+D+E, C+D+E, D+E+F, E+F+G,
    A+B+C+D, B+C+D+E, C+D+E+F, D+E+F+G,
    A+B+C+D+E, B+C+D+E+F, C+D+E+F+G,
    A+B+C+D+E+F, B+C+D+E+F+G,
    A+B+C+D+E+F+G,
    // Tüm 2'li kombinasyonlar C(7,2)=21 (20–40)
    A+B, A+C, A+D, A+E, A+F, A+G,
    B+C, B+D, B+E, B+F, B+G,
    C+D, C+E, C+F, C+G,
    D+E, D+F, D+G,
    E+F, E+G,
    F+G,
  ];
}

export function okbt7BasamakHucreDegeri(kodRaw: unknown, index: number): string {
  const sums = okbt7BasamakToplamlari(kodRaw);
  if (!sums || index < 0 || index >= sums.length) return "";
  return String(sums[index]);
}
