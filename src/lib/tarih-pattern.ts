/**
 * Tarih sütunu filtreleri: * ve ? jokerleri + VEYA listesi (+ veya virgül).
 * Sunucuda `tarih_arama` (generated) kolonu üzerinde ILIKE ile kullanılır.
 */

/** Joker içeren parça → tam satır ILIKE; düz metin → içerir (%…%). */
export function tarihPatternHasGlob(part: string): boolean {
  return part.includes("*") || part.includes("?");
}

/** PostgreSQL LIKE için: * → %, ? → _, literal % _ \ kaçış */
export function globToPostgresLike(glob: string): string {
  let out = "";
  for (const ch of glob) {
    if (ch === "*") out += "%";
    else if (ch === "?") out += "_";
    else if (ch === "%" || ch === "_" || ch === "\\") out += `\\${ch}`;
    else out += ch;
  }
  return out;
}

/** Jokersiz parçada içerir araması için LIKE özel karakterlerini kaçır */
export function escapeLikeContains(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * VEYA dalları: + ve virgül (ör. ?1*,?3*,?5*).
 * Virgül sadece kısa parçalar arasında OR varsayımı; tarih metninde virgül beklenmez.
 */
export function splitTarihOrPatterns(raw: string): string[] {
  const s = raw.trim();
  if (!s) return [];
  return s
    .split(/[+，,]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** API / istemci ortak: kullanıcı girdisini Türkçe küçük harfe */
export function normalizeTarihFilterInput(raw: string): string {
  return raw.trim().toLocaleLowerCase("tr-TR");
}

/** Tek parça için ILIKE deseni (kolon zaten lower). */
export function tarihPartToIlike(part: string): string {
  const p = part.trim();
  if (!p) return "%";
  if (tarihPatternHasGlob(p)) return globToPostgresLike(p);
  return `%${escapeLikeContains(p)}%`;
}
