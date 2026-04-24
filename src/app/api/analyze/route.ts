import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * POST /api/analyze
 *
 * Eşleştirme Paneli RPC çağrısı. İstemciden seçilen boyutları ve
 * kapsam filtrelerini alıp analyze_combos() fonksiyonunu çağırır.
 *
 * Kapsam filtreleri — NULL ise o filtre uygulanmaz:
 *   sonuc_iy / sonuc_ms : ILIKE '%...%' ile kısmi eşleşme (örn "1-0")
 *   tarih_from / tarih_to : tarih aralığı
 *   lig_adi : tam eşleşme
 *   alt_lig_id : tam eşleşme
 *   gun / ay / yil : takvim bileşenleri (EXTRACT)
 *
 * Ayrıca sunucu, boyut başına **kapsam (coverage)** hesaplar:
 *   her boyutun olası uç uzayı (10^n) vs. gerçekten gözlenen uç sayısı.
 *   Eksik uçlar kullanıcıya listelenir (çok büyükse kısaltılmış).
 */

const SAFE_RAW_JSON_KEY = /^[A-Za-z0-9_]+$/;
const ALLOWED_BASE_COLS = new Set(["id", "kod_ms", "kod_cs", "kod_iy", "kod_au"]);

function normalizeDimToRpcString(col: string, n: number): string | null {
  const c = String(col ?? "").trim();
  if (!c) return null;
  if (ALLOWED_BASE_COLS.has(c)) return `${c}:${n}`;
  if (c.startsWith("raw_")) {
    const key = c.slice("raw_".length).trim();
    if (!key || !SAFE_RAW_JSON_KEY.test(key)) return null;
    return `raw:${key}:${n}`;
  }
  return null;
}

interface AnalyzeRequest {
  dims: Array<{ col: string; n: number }>;
  scope?: {
    sonuc_iy?: string;
    sonuc_ms?: string;
    tarih_from?: string;
    tarih_to?: string;
    lig_adi?: string;
    alt_lig_id?: number;
    gun?: number;
    ay?: number;
    yil?: number;
    takim_ev_ilike?: string;
    takim_dep_ilike?: string;
    takim_or_ilike?: string;
    swap_skor_all?: boolean;
    force_raw_skor?: boolean;
    force_swap_skor?: boolean;
  };
  limit?: number;
}

interface ComboRow {
  combo: string;
  cnt: number | string;
  ids: number[] | null;
}

/** Eksik uç listesinin ne kadarını istemciye iletelim. */
const MAX_MISSING_SAMPLES = 5000;

/**
 * Verilen n için tüm olası uçları sıralı olarak üretir: 0..10^n-1, lpad(n).
 * Bu fonksiyonun universe hali bellekte O(10^n) — n ≤ 5 için sorun değil.
 */
function enumerateUniverse(n: number): string[] {
  const total = 10 ** n;
  const out: string[] = new Array(total);
  for (let i = 0; i < total; i++) {
    out[i] = String(i).padStart(n, "0");
  }
  return out;
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
  if (dims.length > 12) {
    return NextResponse.json({ ok: false, error: "En fazla 12 boyut seçilebilir" }, { status: 400 });
  }

  const dimStrings: string[] = [];
  for (const d of dims) {
    if (!Number.isInteger(d.n) || d.n < 1 || d.n > 10) {
      return NextResponse.json({ ok: false, error: `Geçersiz hane sayısı: ${d.n}` }, { status: 400 });
    }
    const rpc = normalizeDimToRpcString(d.col, d.n);
    if (!rpc) {
      return NextResponse.json({ ok: false, error: `Geçersiz boyut: ${d.col}` }, { status: 400 });
    }
    dimStrings.push(rpc);
  }

  const scope = body.scope ?? {};
  const limit = Math.min(Math.max(body.limit ?? 50000, 100), 200000);

  // takvim bileşen doğrulaması
  const gun = Number.isInteger(scope.gun) && scope.gun! >= 1 && scope.gun! <= 31 ? scope.gun! : null;
  const ay  = Number.isInteger(scope.ay)  && scope.ay!  >= 1 && scope.ay!  <= 12 ? scope.ay!  : null;
  const yil = Number.isInteger(scope.yil) && scope.yil! >= 1900 && scope.yil! <= 2100 ? scope.yil! : null;

  const supabase = createServiceClient();

  const iyLike = scope.sonuc_iy?.trim() ? `%${scope.sonuc_iy.trim()}%` : null;
  const msLike = scope.sonuc_ms?.trim() ? `%${scope.sonuc_ms.trim()}%` : null;

  const evPat = scope.takim_ev_ilike?.trim() || null;
  const depPat = scope.takim_dep_ilike?.trim() || null;
  const orPat = scope.takim_or_ilike?.trim() || null;
  const swapSkor = Boolean(scope.swap_skor_all);
  const forceRaw = Boolean(scope.force_raw_skor);
  const forceSwap = Boolean(scope.force_swap_skor);

  const { data, error } = await supabase.rpc("analyze_combos", {
    p_dims: dimStrings,
    p_sonuc_iy: iyLike,
    p_sonuc_ms: msLike,
    p_tarih_from: scope.tarih_from?.trim() || null,
    p_tarih_to: scope.tarih_to?.trim() || null,
    p_lig_adi: scope.lig_adi?.trim() || null,
    p_alt_lig_id: typeof scope.alt_lig_id === "number" ? scope.alt_lig_id : null,
    p_gun: gun,
    p_ay: ay,
    p_yil: yil,
    p_takim_ev_ilike: evPat,
    p_takim_dep_ilike: depPat,
    p_takim_or_ilike: orPat,
    p_swap_skor_all: swapSkor,
    p_force_raw_skor: forceRaw,
    p_force_swap_skor: forceSwap,
    p_limit: limit,
  });

  if (error) {
    console.error("[api/analyze] RPC error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "RPC hatası",
        hint: "Supabase’te analyze_combos güncel mi? sql/add-analyze-combos-takim-skor-norm.sql dosyasını tekrar çalıştırın (p_force_raw_skor / p_force_swap_skor parametreleri).",
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

  // --- Boyut başına "görüldü / eksik" analizi ---
  // combos elementi "part0|part1|..." biçiminde olduğundan, her boyut için
  // benzersiz parçaları topluyoruz. Bu, combos kırpılmadan ÖNCE — yani tüm
  // combos üzerinden hesaplanıyor ki kapsam doğru olsun.
  const coverage = dims.map((d, idx) => {
    const seenSet = new Set<string>();
    for (const c of combos) {
      const parts = c.combo.split("|");
      const v = parts[idx];
      if (v !== undefined) seenSet.add(v);
    }
    // n ≤ 5 için olası uzayı listele; daha büyük n'de eksik listesi anlamlı
    // değil (10^6 = çok büyük), yalnızca sayıyı bildiriyoruz.
    const universeSize = 10 ** d.n;
    let missingSamples: string[] = [];
    let missingTruncated = false;
    if (d.n <= 5) {
      const universe = enumerateUniverse(d.n);
      const missingAll: string[] = [];
      for (const u of universe) {
        if (!seenSet.has(u)) missingAll.push(u);
      }
      if (missingAll.length > MAX_MISSING_SAMPLES) {
        missingSamples = missingAll.slice(0, MAX_MISSING_SAMPLES);
        missingTruncated = true;
      } else {
        missingSamples = missingAll;
      }
    } else {
      missingTruncated = true; // liste verilmedi
    }
    return {
      col: d.col,
      n: d.n,
      universe: universeSize,
      seen: seenSet.size,
      missing: Math.max(0, universeSize - seenSet.size),
      missingSamples,
      missingTruncated,
    };
  });

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
    coverage,
  });
}
