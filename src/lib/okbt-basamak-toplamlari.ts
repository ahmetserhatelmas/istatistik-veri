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

/** IY kodundan A,B,C,D,E (0–9). */
export function parseIyKodBesBasamak(kodRaw: unknown): [number, number, number, number, number] | null {
  const digits = String(kodRaw ?? "").replace(/\D/g, "");
  if (digits.length < 5) return null;
  const d = digits.length > 5 ? digits.slice(-5) : digits;
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
