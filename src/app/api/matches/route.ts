import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { ALL_COLS } from "@/lib/columns";

// raw_data içinden çekeceğimiz key'ler
const RAW_KEYS = Array.from(
  new Set(ALL_COLS.filter((c) => !c.dbCol).map((c) => c.key))
);

const DB_COLS = [
  "id","tarih","saat","tarih_tr_gunlu",
  "lig_kodu","lig_adi","lig_id",
  "alt_lig_adi","alt_lig_id",
  "sezon_adi","sezon_id",
  "t1","t1i","t2","t2i",
  "hakem","t1_antrenor","t2_antrenor",
  "sonuc_iy","sonuc_ms",
  "ft1","ft2","ht1","ht2",
  "ms1","msx","ms2",
  "iy1","iyx","iy2",
  "a","u","kg_var","kg_yok",
  "kod_ms","kod_cs","kod_iy","kod_au",
  "mac_suffix4","mac_suffix3","mac_suffix2",
  "raw_data",
];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page  = Math.max(1, Number(sp.get("page")  || 1));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 50)));
  const offset = (page - 1) * limit;

  const supabase = createServiceClient();
  let query = supabase
    .from("matches")
    .select(DB_COLS.join(","), { count: "exact" });

  if (sp.get("tarih_from")) query = query.gte("tarih", sp.get("tarih_from")!);
  if (sp.get("tarih_to"))   query = query.lte("tarih", sp.get("tarih_to")!);
  if (sp.get("lig"))        query = query.ilike("lig_adi", `%${sp.get("lig")}%`);
  if (sp.get("alt_lig"))    query = query.ilike("alt_lig_adi", `%${sp.get("alt_lig")}%`);
  if (sp.get("takim")) {
    const t = `%${sp.get("takim")}%`;
    query = query.or(`t1.ilike.${t},t2.ilike.${t}`);
  }
  if (sp.get("sonuc_iy"))  query = query.eq("sonuc_iy", sp.get("sonuc_iy")!);
  if (sp.get("sonuc_ms"))  query = query.eq("sonuc_ms", sp.get("sonuc_ms")!);
  if (sp.get("hakem"))     query = query.ilike("hakem", `%${sp.get("hakem")}%`);
  if (sp.get("suffix4"))   query = query.eq("mac_suffix4", sp.get("suffix4")!);
  if (sp.get("suffix3"))   query = query.eq("mac_suffix3", sp.get("suffix3")!);

  const { data, count, error } = await query
    .order("tarih", { ascending: false })
    .order("saat",  { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type RawRow = Record<string, unknown>;
  const rows = ((data as unknown) as RawRow[] || []).map((row: RawRow) => {
    const rd = (row["raw_data"] as Record<string, unknown>) ?? {};
    const flat: Record<string, unknown> = { ...row };
    delete flat["raw_data"];
    for (const k of RAW_KEYS) flat[k] = rd[k] ?? null;
    return flat;
  });

  return NextResponse.json({
    data: rows,
    page,
    limit,
    total: count,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
