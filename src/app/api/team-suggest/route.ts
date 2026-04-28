import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 30;

/** Öneri araması: ILIKE jokerlerini kullanıcıdan çıkar (tek satır sorgu; kaçış DB ayarına bağlı olmasın). */
function sanitizeSuggestQuery(s: string): string {
  return s.replace(/[%_\\]/g, "").trim();
}

/**
 * Takım adı önerisi: yalnızca ev (t1) veya yalnızca dep (t2) sütununda eşleşen benzersiz isimler.
 * Maç satırı değil — dropdown’da tek takım adı listesi.
 */
export async function GET(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json(
      { error: "Supabase ortam değişkenleri eksik (.env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const laneRaw = req.nextUrl.searchParams.get("lane") ?? "ev";
  const lane = laneRaw === "dep" ? "dep" : laneRaw === "her" ? "her" : "ev";
  if (!q || q.length > 80) {
    return NextResponse.json({ teams: [] as string[] });
  }

  const cleaned = sanitizeSuggestQuery(q);
  if (!cleaned) {
    return NextResponse.json({ teams: [] as string[] });
  }
  const pat = `%${cleaned}%`;

  const supabase = createServiceClient();

  if (lane === "her") {
    // t1 ve t2'den birleşik öneri (OR arama için)
    const [r1, r2] = await Promise.all([
      supabase.from("matches").select("t1").ilike("t1", pat).not("t1", "is", null).limit(800),
      supabase.from("matches").select("t2").ilike("t2", pat).not("t2", "is", null).limit(800),
    ]);
    const set = new Set<string>();
    for (const row of r1.data ?? []) {
      const v = (row as Record<string, unknown>)["t1"];
      if (typeof v === "string" && v.trim()) set.add(v.trim());
    }
    for (const row of r2.data ?? []) {
      const v = (row as Record<string, unknown>)["t2"];
      if (typeof v === "string" && v.trim()) set.add(v.trim());
    }
    const teams = [...set].sort((a, b) => a.localeCompare(b, "tr", { sensitivity: "base" })).slice(0, 60);
    return NextResponse.json({ teams });
  }

  const col = lane === "dep" ? "t2" : "t1";
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
  const teams = [...set].sort((a, b) => a.localeCompare(b, "tr", { sensitivity: "base" })).slice(0, 60);

  return NextResponse.json({ teams });
}
