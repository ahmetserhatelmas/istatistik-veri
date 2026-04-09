import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 50)));
  const offset = (page - 1) * limit;

  const supabase = createServiceClient();
  let query = supabase
    .from("matches")
    .select(
      "id,tarih,saat,lig_adi,alt_lig_adi,t1,t2,sonuc_iy,sonuc_ms,ms1,msx,ms2,iy1,iyx,iy2,a,u,kg_var,kg_yok,hakem,t1_antrenor,t2_antrenor,kod_ms,kod_cs,kod_iy,mac_suffix4,mac_suffix3,mac_suffix2,ft1,ft2,ht1,ht2",
      { count: "exact" }
    );

  if (sp.get("tarih_from")) query = query.gte("tarih", sp.get("tarih_from")!);
  if (sp.get("tarih_to")) query = query.lte("tarih", sp.get("tarih_to")!);
  if (sp.get("lig")) query = query.ilike("lig_adi", `%${sp.get("lig")}%`);
  if (sp.get("alt_lig")) query = query.ilike("alt_lig_adi", `%${sp.get("alt_lig")}%`);
  if (sp.get("takim")) {
    const t = `%${sp.get("takim")}%`;
    query = query.or(`t1.ilike.${t},t2.ilike.${t}`);
  }
  if (sp.get("sonuc_iy")) query = query.eq("sonuc_iy", sp.get("sonuc_iy")!);
  if (sp.get("sonuc_ms")) query = query.eq("sonuc_ms", sp.get("sonuc_ms")!);
  if (sp.get("hakem")) query = query.ilike("hakem", `%${sp.get("hakem")}%`);
  if (sp.get("suffix4")) query = query.eq("mac_suffix4", sp.get("suffix4")!);
  if (sp.get("suffix3")) query = query.eq("mac_suffix3", sp.get("suffix3")!);

  const { data, count, error } = await query
    .order("tarih", { ascending: false })
    .order("saat", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data,
    page,
    limit,
    total: count,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
