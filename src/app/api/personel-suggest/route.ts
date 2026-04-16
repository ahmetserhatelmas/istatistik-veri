import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 30;

function sanitizeSuggestQuery(s: string): string {
  return s.replace(/[%_\\]/g, "").trim();
}

function resolvePersonelCol(raw: string): "hakem" | "t1_antrenor" | "t2_antrenor" {
  if (raw === "t1_antrenor" || raw === "t2_antrenor" || raw === "hakem") return raw;
  return "hakem";
}

/** `role=ant_ev_veya_dep`: t1_antrenor ve t2_antrenor birleşik benzersiz isim listesi (OR aramasıyla uyumlu). */
async function suggestAntEvVeyaDep(
  supabase: ReturnType<typeof createServiceClient>,
  pat: string
): Promise<{ names: string[]; error?: string }> {
  const [r1, r2] = await Promise.all([
    supabase
      .from("matches")
      .select("t1_antrenor")
      .ilike("t1_antrenor", pat)
      .not("t1_antrenor", "is", null)
      .limit(900),
    supabase
      .from("matches")
      .select("t2_antrenor")
      .ilike("t2_antrenor", pat)
      .not("t2_antrenor", "is", null)
      .limit(900),
  ]);
  if (r1.error) return { names: [], error: r1.error.message };
  if (r2.error) return { names: [], error: r2.error.message };
  const set = new Set<string>();
  for (const row of r1.data ?? []) {
    const v = (row as { t1_antrenor?: string | null }).t1_antrenor;
    if (typeof v === "string" && v.trim()) set.add(v.trim());
  }
  for (const row of r2.data ?? []) {
    const v = (row as { t2_antrenor?: string | null }).t2_antrenor;
    if (typeof v === "string" && v.trim()) set.add(v.trim());
  }
  const names = [...set].sort((a, b) => a.localeCompare(b, "tr", { sensitivity: "base" })).slice(0, 60);
  return { names };
}

/**
 * Hakem / ev TD / dep TD / ev+dep TD (OR) sütunlarında benzersiz isim önerisi.
 * `role`: hakem | t1_antrenor | t2_antrenor | ant_ev_veya_dep
 */
export async function GET(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json(
      { error: "Supabase ortam değişkenleri eksik (.env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const roleRaw = req.nextUrl.searchParams.get("role")?.trim() ?? "hakem";

  if (!q || q.length > 80) {
    return NextResponse.json({ names: [] as string[] });
  }

  const cleaned = sanitizeSuggestQuery(q);
  if (!cleaned) {
    return NextResponse.json({ names: [] as string[] });
  }
  const pat = `%${cleaned}%`;

  const supabase = createServiceClient();

  if (roleRaw === "ant_ev_veya_dep") {
    const { names, error } = await suggestAntEvVeyaDep(supabase, pat);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ names });
  }

  const col = resolvePersonelCol(roleRaw);
  const { data, error } = await supabase
    .from("matches")
    .select(col)
    .ilike(col, pat)
    .not(col, "is", null)
    .limit(1500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const set = new Set<string>();
  for (const row of data ?? []) {
    const v = (row as Record<string, unknown>)[col];
    if (typeof v === "string" && v.trim()) set.add(v.trim());
  }
  const names = [...set].sort((a, b) => a.localeCompare(b, "tr", { sensitivity: "base" })).slice(0, 60);

  return NextResponse.json({ names });
}
