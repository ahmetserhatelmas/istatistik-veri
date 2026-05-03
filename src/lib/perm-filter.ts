/**
 * Permütasyon filtresi: `~385` → `*385,*358,*538,*583,*835,*853`
 *
 * Kullanıcı tilde (~) önekiyle rakam yazarsa o rakamların tüm sıralamalarını
 * otomatik olarak üretir ve her birine `*` (sonek joker) ekler.
 * Sonuç virgülle ayrılmış OR deseni olarak döner → API'de ilike OR ile çalışır.
 *
 * Sınırlar:
 *   - Tilde olmayan değerler dokunulmadan döner.
 *   - 2–5 rakam arası desteklenir (5! = 120, 6! = 720 → URL patlar).
 *   - Rakam olmayan karakterler tilde'den sonra yok sayılır.
 */

/** Bir dizinin tüm permütasyonlarını döndürür. */
function allPerms<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr.slice()];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.filter((_, j) => j !== i);
    for (const perm of allPerms(rest)) {
      result.push([arr[i]!, ...perm]);
    }
  }
  return result;
}

/**
 * `~385` gibi giriş varsa tüm permütasyon joker desenlerine (`*385,*358,...`) açar.
 * Yoksa `raw` değeri olduğu gibi döner.
 */
export function expandPermFilter(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("~")) return t;

  const digits = t.slice(1).replace(/\D/g, "");
  if (digits.length < 2 || digits.length > 5) return t; // pratik sınır

  const perms = allPerms(digits.split(""));
  const unique = [...new Set(perms.map((p) => p.join("")))];
  return unique.map((p) => `*${p}`).join(",");
}
