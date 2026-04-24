/**
 * PostgREST / matches API ile aynı ILIKE kaçışı — düz metin tam eşleşme veya
 * `bidir_takim_*` "contains" süzümünde `%...%` sarmalayıcısı için.
 */

export function escapeIlikeExactLiteral(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Üst çubuk `takim=` veya çift yönlü ev/dep kutuları: alt dizgi, büyük/küçük harf duyarsız. */
export function teamContainsIlikePattern(committed: string): string | null {
  const t = committed.trim();
  if (!t) return null;
  return `%${escapeIlikeExactLiteral(t)}%`;
}
