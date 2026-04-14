import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  normalizeTarihFilterInput,
  splitTarihOrPatterns,
  tarihPartToIlike,
} from "@/lib/tarih-pattern";

/** Tarih ILIKE + büyük tablo: exact count ağır; planned + süre sınırı zaman aşımını azaltır. */
export const maxDuration = 60;

function flattenRawValue(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

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
  "sport_turu","bookmaker_id",
  "raw_data",
];

// dbCol sütunların id → DB kolon adı + arama tipi
const DB_COL_MAP: Record<string, { col: string; mode: "ilike" | "eq" }> = {
  id:       { col: "id",            mode: "eq" },
  lig_adi:  { col: "lig_adi",       mode: "ilike" },
  lig_kodu: { col: "lig_kodu",      mode: "ilike" },
  alt_lig:  { col: "alt_lig_adi",   mode: "ilike" },
  sezon:    { col: "sezon_adi",     mode: "ilike" },
  t1:       { col: "t1",            mode: "ilike" },
  t2:       { col: "t2",            mode: "ilike" },
  hakem:    { col: "hakem",         mode: "ilike" },
  t1_antrenor: { col: "t1_antrenor", mode: "ilike" },
  t2_antrenor: { col: "t2_antrenor", mode: "ilike" },
  t1i:      { col: "t1i",           mode: "eq" },
  t2i:      { col: "t2i",           mode: "eq" },
  sonuc_iy: { col: "sonuc_iy",      mode: "ilike" },
  sonuc_ms: { col: "sonuc_ms",      mode: "ilike" },
  suffix4:  { col: "mac_suffix4",   mode: "ilike" },
  suffix3:  { col: "mac_suffix3",   mode: "ilike" },
  mbs:      { col: "mac_suffix4",   mode: "ilike" },
  // tarih: cf_tarih ayrı işlenir (tarih_arama + * ? joker / virgül-VEYA)
  saat:     { col: "saat",          mode: "ilike" },
  kod_ms:   { col: "kod_ms",        mode: "eq" },
  kod_cs:   { col: "kod_cs",        mode: "eq" },
  kod_iy:   { col: "kod_iy",        mode: "eq" },
  kod_au:   { col: "kod_au",        mode: "eq" },
  lig_id:     { col: "lig_id",     mode: "eq" },
  alt_lig_id: { col: "alt_lig_id", mode: "eq" },
  sezon_id:   { col: "sezon_id",   mode: "eq" },
  bookmaker_id: { col: "bookmaker_id", mode: "eq" },
  sport_turu: { col: "sport_turu", mode: "ilike" },
};

export async function GET(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json(
      { error: "Supabase ortam değişkenleri eksik (.env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const page  = Math.max(1, Number(sp.get("page")  || 1));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 100)));
  const offset = (page - 1) * limit;

  const cfTarihRaw = sp.get("cf_tarih")?.trim() ?? "";
  const tarihFiltParts = cfTarihRaw
    ? splitTarihOrPatterns(normalizeTarihFilterInput(cfTarihRaw))
    : [];
  /** exact COUNT(*) + ILIKE '%…%' ~400k satırda 7–10s+ → zaman aşımı; planned yaklaşık sayım */
  const countMode = tarihFiltParts.length > 0 ? ("planned" as const) : ("exact" as const);

  const supabase = createServiceClient();
  let query = supabase
    .from("matches")
    .select(DB_COLS.join(","), { count: countMode });

  // ── Üst filtreler ────────────────────────────────────────────────────────────
  const tarihFrom = sp.get("tarih_from") || "";
  const tarihTo   = sp.get("tarih_to")   || "";
  // Tek tarih girilmişse o günü tam göster (from = to)
  if (tarihFrom && tarihTo) {
    query = query.gte("tarih", tarihFrom).lte("tarih", tarihTo);
  } else if (tarihFrom) {
    query = query.gte("tarih", tarihFrom).lte("tarih", tarihFrom);
  } else if (tarihTo) {
    query = query.lte("tarih", tarihTo);
  }
  if (sp.get("lig"))        query = query.ilike("lig_adi", `%${sp.get("lig")}%`);
  if (sp.get("alt_lig"))    query = query.ilike("alt_lig_adi", `%${sp.get("alt_lig")}%`);
  if (sp.get("takim")) {
    const t = `%${sp.get("takim")}%`;
    query = query.or(`t1.ilike.${t},t2.ilike.${t}`);
  }
  if (sp.get("sonuc_iy"))  query = query.ilike("sonuc_iy", `%${sp.get("sonuc_iy")}%`);
  if (sp.get("sonuc_ms"))  query = query.ilike("sonuc_ms", `%${sp.get("sonuc_ms")}%`);
  if (sp.get("hakem"))     query = query.ilike("hakem", `%${sp.get("hakem")}%`);
  if (sp.get("suffix4"))   query = query.ilike("mac_suffix4", `%${sp.get("suffix4")}%`);
  if (sp.get("suffix3"))   query = query.ilike("mac_suffix3", `%${sp.get("suffix3")}%`);

  // ── Sütun bazlı filtreler (cf_{colId}=değer) ─────────────────────────────
  if (tarihFiltParts.length === 1) {
    query = query.ilike("tarih_arama", tarihPartToIlike(tarihFiltParts[0]!));
  } else if (tarihFiltParts.length > 1) {
    const orExpr = tarihFiltParts
      .map((p) => {
        const like = tarihPartToIlike(p);
        const q = like.replace(/"/g, '""');
        return `tarih_arama.ilike."${q}"`;
      })
      .join(",");
    query = query.or(orExpr);
  }
  /* tarihFiltParts.length === 0 ve cf_tarih dolu: sadece ayraç → filtre yok */

  for (const [paramKey, val] of sp.entries()) {
    if (!paramKey.startsWith("cf_") || !val.trim()) continue;
    const colId = paramKey.slice(3);
    if (colId === "tarih") continue;
    const def = DB_COL_MAP[colId];
    if (!def) continue;
    const v = val.trim();
    if (def.mode === "ilike") {
      query = query.ilike(def.col, `%${v}%`);
    } else if (def.mode === "eq") {
      // id (bigint) için özel: sayıya çevir; diğer text eq için string
      if (def.col === "id") {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) query = query.eq(def.col, n);
      } else {
        const n = Number(v);
        query = query.eq(def.col, Number.isFinite(n) ? n : v);
      }
    }
  }

  const { data, count, error } = await query
    .order("tarih", { ascending: false })
    .order("saat",  { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    const msg = [e.message, e.details, e.hint].filter(Boolean).join(" | ");
    const missingTarihArama =
      /tarih_arama/i.test(msg) ||
      (e.code === "42703" && /tarih_arama|matches\./i.test(msg)) ||
      /schema cache.*tarih_arama|Could not find.*tarih_arama/i.test(msg);
    if (missingTarihArama) {
      return NextResponse.json(
        {
          error:
            "tarih_arama kolonu yok veya API şemada görünmüyor. sql/add-tarih-arama.sql (+ gerekirse patch) çalıştırın; Supabase’te tabloyu yenileyin.",
          detail: msg,
          code: e.code,
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: e.message ?? "Bilinmeyen hata", detail: msg, code: e.code }, { status: 500 });
  }

  type RawRow = Record<string, unknown>;
  const rows = ((data as unknown) as RawRow[] || []).map((row: RawRow) => {
    const rd = (row["raw_data"] as Record<string, unknown>) ?? {};
    const flat: Record<string, unknown> = { ...row };
    delete flat["raw_data"];
    for (const [k, v] of Object.entries(rd)) {
      flat[k] = flattenRawValue(v);
    }
    return flat;
  });

  const total = count ?? 0;
  return NextResponse.json({
    data: rows,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}
