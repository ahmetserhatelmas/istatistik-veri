/**
 * İY / MS skor hücresi filtreleri için ortak parser.
 *
 * Örnekler:
 * - "2-1" → core "2-1", boş yok
 * - "2-1,_" → virgül-OR ile ayrı parça: "_" → boş
 * - "2-1_" / "2-1._" / "2-1.._/" → core "2-1", boşları da dahil et
 */
export function parsePlainSkorTokenWithBlankSuffix(token: string): { core: string; includeBlank: boolean } {
  const t = token.trim();
  const m = /^(\d+-\d+)([._\s\/\\-]*)$/.exec(t);
  if (!m) return { core: t, includeBlank: false };
  const core = m[1]!;
  const rest = m[2] ?? "";
  if (!rest) return { core, includeBlank: false };
  // Sonekte en az bir '_' veya boşluk varsa boşları da dahil et
  const includeBlank = /[_\s]/.test(rest);
  return { core, includeBlank };
}
