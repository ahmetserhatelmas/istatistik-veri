/**
 * OKBT computed kolonları (tamsayı) için joker filtre: PostgREST `::text ilike`
 * her yerde yok; küçük uzayda (0..max) genişletip `.in()` ile sunucuda uygularız.
 * Böylece sayfalama, joker ile tutarlı kalır (yalnızca bu sayfadaki 100 satır değil).
 */

const OKBT_WILDCARD_MAX_INCLUSIVE = 99;

/** Tek değer + tek desen (virgül/artı yok); MatchTable `matchWildcard` ile aynı mantık. */
function matchOneWildcard(value: string, pattern: string): boolean {
  const val = value.trim().toLowerCase();
  const p = pattern.trim().toLowerCase();
  if (!p) return true;
  if (!p.includes("*") && !p.includes("?")) return val === p;
  const re = p
    .replace(/[-[\]{}()|^$\\]/g, "\\$&")
    .replace(/\./g, "\\.")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  try {
    return new RegExp(`^${re}$`, "i").test(val);
  } catch {
    return val === p;
  }
}

export type OkbtWildcardExpand =
  | { kind: "all" }
  | { kind: "none" }
  | { kind: "ints"; ints: number[] }
  | null;

/**
 * Virgül/artı içeren ifade → null (`parseObktbServerOrGroups` veya istemci yolu).
 * Tek parça joker → 0..max arasında eşleşen tamsayılar.
 */
export function expandOkbtWildcardFilter(v: string, maxInclusive = OKBT_WILDCARD_MAX_INCLUSIVE): OkbtWildcardExpand {
  const t = v.trim();
  if (!t || t.includes(",") || t.includes("+")) return null;
  if (!t.includes("*") && !t.includes("?")) return null;

  const ints: number[] = [];
  for (let n = 0; n <= maxInclusive; n++) {
    if (matchOneWildcard(String(n), t)) ints.push(n);
  }
  if (ints.length === maxInclusive + 1) return { kind: "all" };
  if (ints.length === 0) return { kind: "none" };
  return { kind: "ints", ints };
}
