import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * POST /api/analyze
 *
 * Eşleştirme Paneli RPC çağrısı. İstemciden seçilen boyutları ve
 * kapsam filtrelerini alıp analyze_combos() fonksiyonunu çağırır.
 *
 * Body:
 * {
 *   dims: Array<{ col: "id"|"kod_ms"|"kod_cs"|"kod_iy"|"kod_au", n: 2|3|4|5 }>,
 *   scope?: {
 *     sonuc_iy?: string,    // örn "1-0" (ILIKE ile %... %)
 *     sonuc_ms?: string,    // örn "3-0"
 *     tarih_from?: string,  // "YYYY-MM-DD"
 *     tarih_to?:   string,  // "YYYY-MM-DD"
 *     lig_adi?: string,
 *     alt_lig_id?: number,
 *   },
 *   limit?: number          // max analiz edilecek maç sayısı (güvenlik) — default 50000
 * }
 *
 * Response:
 * {
 *   ok: true,
 *   total: number,         // analiz edilen toplam maç
 *   uniqueCount: number,   // benzersiz kombinasyon
 *   repeatCount: number,   // 2+ kere görülen kombinasyon sayısı
 *   repeatMatches: number, // tekrar kombinasyonlardaki toplam maç sayısı
 *   combos: Array<{ combo: string, cnt: number, ids: number[] }> // dolaylı (ilk 1000)
 *   dims: string[],        // kullanıcıya geri gösterim için
 * }
 */

type DimCol = "id" | "kod_ms" | "kod_cs" | "kod_iy" | "kod_au";
const ALLOWED_COLS: readonly DimCol[] = ["id", "kod_ms", "kod_cs", "kod_iy", "kod_au"] as const;

interface AnalyzeRequest {
  dims: Array<{ col: DimCol; n: number }>;
  scope?: {
    sonuc_iy?: string;
    sonuc_ms?: string;
    tarih_from?: string;
    tarih_to?: string;
    lig_adi?: string;
    alt_lig_id?: number;
  };
  limit?: number;
}

interface ComboRow {
  combo: string;
  cnt: number | string;
  ids: number[] | null;
}

export async function POST(req: NextRequest) {
  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz JSON" }, { status: 400 });
  }

  const dims = Array.isArray(body.dims) ? body.dims : [];
  if (dims.length === 0) {
    return NextResponse.json({ ok: false, error: "En az bir boyut seçmelisiniz" }, { status: 400 });
  }
  if (dims.length > 8) {
    return NextResponse.json({ ok: false, error: "En fazla 8 boyut seçilebilir" }, { status: 400 });
  }

  const dimStrings: string[] = [];
  for (const d of dims) {
    if (!ALLOWED_COLS.includes(d.col)) {
      return NextResponse.json({ ok: false, error: `Geçersiz alan: ${d.col}` }, { status: 400 });
    }
    if (!Number.isInteger(d.n) || d.n < 1 || d.n > 10) {
      return NextResponse.json({ ok: false, error: `Geçersiz hane sayısı: ${d.n}` }, { status: 400 });
    }
    dimStrings.push(`${d.col}:${d.n}`);
  }

  const scope = body.scope ?? {};
  const limit = Math.min(Math.max(body.limit ?? 50000, 100), 200000);

  const supabase = createServiceClient();

  // Skor filtresi: kullanıcı "1-0" yazdı → %1-0% (ILIKE pattern)
  const iyLike = scope.sonuc_iy?.trim() ? `%${scope.sonuc_iy.trim()}%` : null;
  const msLike = scope.sonuc_ms?.trim() ? `%${scope.sonuc_ms.trim()}%` : null;

  const { data, error } = await supabase.rpc("analyze_combos", {
    p_dims: dimStrings,
    p_sonuc_iy: iyLike,
    p_sonuc_ms: msLike,
    p_tarih_from: scope.tarih_from?.trim() || null,
    p_tarih_to: scope.tarih_to?.trim() || null,
    p_lig_adi: scope.lig_adi?.trim() || null,
    p_alt_lig_id: typeof scope.alt_lig_id === "number" ? scope.alt_lig_id : null,
    p_limit: limit,
  });

  if (error) {
    console.error("[api/analyze] RPC error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "RPC hatası",
        hint: "sql/create-analyze-combos-fn.sql fonksiyonunun yüklü olduğundan emin olun.",
      },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as ComboRow[];
  const combos = rows.map((r) => ({
    combo: r.combo,
    cnt: Number(r.cnt),
    ids: r.ids ?? [],
  }));

  let total = 0;
  let uniqueCount = 0;
  let repeatCount = 0;
  let repeatMatches = 0;
  for (const c of combos) {
    total += c.cnt;
    if (c.cnt === 1) uniqueCount++;
    else if (c.cnt >= 2) {
      repeatCount++;
      repeatMatches += c.cnt;
    }
  }

  // Büyük combos listesi frontend'e transfer maliyetini artırır — ilk 2000 ile sınırla
  const combosTrimmed = combos.slice(0, 2000);

  return NextResponse.json({
    ok: true,
    total,
    uniqueCount,
    repeatCount,
    repeatMatches,
    combos: combosTrimmed,
    truncated: combos.length > combosTrimmed.length,
    totalCombos: combos.length,
    dims: dimStrings,
  });
}
