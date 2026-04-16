import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  dynamicRawColIdToJsonKey,
  isRawKeyExcludedFromColumns,
  OKBT_MULTI_SOURCE_MAP,
  staticCfRawJsonKeyByColId,
} from "@/lib/columns";
import { OKBT_BASAMAK_LABELS } from "@/lib/okbt-basamak-toplamlari";
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
  ...OKBT_BASAMAK_LABELS.map((_, i) => `obktb_${i}`),
];

function parseObktbFilterIndex(colId: string): number | null {
  const m = /^obktb_(\d+)$/.exec(colId);
  if (!m) return null;
  const i = Number(m[1]);
  if (!Number.isInteger(i) || i < 0 || i >= OKBT_BASAMAK_LABELS.length) return null;
  return i;
}

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

/** Joker / + VEYA ile tam DB arama (GENERATED text sütunları; sql/add-matches-code-arama-columns-01 … 05). */
const CODE_ILIKE_ARAMA: Record<string, string> = {
  id: "id_arama",
  kod_ms: "kod_ms_arama",
  kod_iy: "kod_iy_arama",
  kod_cs: "kod_cs_arama",
  kod_au: "kod_au_arama",
};

function splitCfOrParts(v: string): string[] {
  return v.split("+").map((s) => s.trim()).filter(Boolean);
}

/** UI ? * → SQL ILIKE _ % (Postgres varsayılan kaçış yok; el ile % _ nadir). */
function cfPatternToIlikePattern(pattern: string): string {
  let out = "";
  for (const c of pattern) {
    if (c === "*") out += "%";
    else if (c === "?") out += "_";
    else out += c;
  }
  return out;
}

type CodeFilterBranch =
  | { kind: "ilike"; col: string; pat: string }
  | { kind: "eq"; col: string; num: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST zinciri
function applyCodeColumnPatternFilter(query: any, colId: string, v: string): any {
  const arama = CODE_ILIKE_ARAMA[colId];
  const def = DB_COL_MAP[colId];
  if (!arama || !def) return query;
  const parts = splitCfOrParts(v);
  if (!parts.length) return query;

  const branches: CodeFilterBranch[] = [];
  for (const p of parts) {
    if (p.includes("*") || p.includes("?")) {
      branches.push({ kind: "ilike", col: arama, pat: cfPatternToIlikePattern(p) });
    } else if (/^\d+$/.test(p)) {
      branches.push({ kind: "eq", col: def.col, num: Number(p) });
    } else {
      branches.push({ kind: "ilike", col: arama, pat: cfPatternToIlikePattern(p) });
    }
  }
  if (branches.length === 0) return query;
  if (branches.length === 1) {
    const b = branches[0]!;
    if (b.kind === "ilike") return query.ilike(b.col, b.pat);
    return query.eq(b.col, b.num);
  }
  const orExpr = branches
    .map((b) => {
      if (b.kind === "ilike") {
        const esc = b.pat.replace(/"/g, '""');
        return `${b.col}.ilike."${esc}"`;
      }
      return `${b.col}.eq.${b.num}`;
    })
    .join(",");
  return query.or(orExpr);
}

/** Ham veri alan adı: PostgREST ifadesi için güvenli anahtar. */
const SAFE_RAW_JSON_KEY = /^[A-Za-z0-9_]+$/;

/** Maç Sonucu 1 / X / 2 — matches.ms1 / msx / ms2 (şema sütunu; raw_data JSON değil, daha hızlı). */
const MS_ODDS_DB_COL: Record<string, "ms1" | "msx" | "ms2"> = {
  ms1: "ms1",
  msx: "msx",
  ms2: "ms2",
};

const RAW_KEY_SAMPLE = 2500;
const RAW_KEY_CACHE_MS = 10 * 60 * 1000;
let rawKeyUnionCache: { keys: string[]; fetchedAt: number } | null = null;

async function fetchRawDataKeyUnion(
  supabase: ReturnType<typeof createServiceClient>
): Promise<string[]> {
  const now = Date.now();
  if (rawKeyUnionCache && now - rawKeyUnionCache.fetchedAt < RAW_KEY_CACHE_MS) {
    return rawKeyUnionCache.keys;
  }
  const { data, error } = await supabase
    .from("matches")
    .select("raw_data")
    .order("tarih", { ascending: false })
    .limit(RAW_KEY_SAMPLE);

  if (error) {
    return rawKeyUnionCache?.keys ?? [];
  }
  const keys = new Set<string>();
  for (const row of data ?? []) {
    const rd = row.raw_data as Record<string, unknown> | null;
    if (rd && typeof rd === "object" && !Array.isArray(rd)) {
      for (const k of Object.keys(rd)) {
        if (!isRawKeyExcludedFromColumns(k)) keys.add(k);
      }
    }
  }
  const arr = Array.from(keys);
  rawKeyUnionCache = { keys: arr, fetchedAt: now };
  return arr;
}

function buildMergedRawCfColToJsonKey(rawKeyUnion: string[]): Record<string, string> {
  const base = { ...staticCfRawJsonKeyByColId() };
  for (const id of Object.keys(MS_ODDS_DB_COL)) delete base[id];
  const dyn = dynamicRawColIdToJsonKey(rawKeyUnion);
  return { ...base, ...dyn };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST zinciri
function applyRawJsonPathIlikeFilter(query: any, jsonKey: string, v: string): any {
  if (!SAFE_RAW_JSON_KEY.test(jsonKey)) return query;
  const field = `raw_data->>${jsonKey}`;
  const parts = splitCfOrParts(v);
  if (!parts.length) return query;

  type Br = { pat: string };
  const branches: Br[] = [];
  for (const p of parts) {
    if (p.includes("*") || p.includes("?")) {
      branches.push({ pat: cfPatternToIlikePattern(p) });
    } else {
      branches.push({ pat: `%${p}%` });
    }
  }
  if (branches.length === 1) {
    return query.ilike(field, branches[0]!.pat);
  }
  const orExpr = branches
    .map(({ pat }) => {
      const esc = pat.replace(/"/g, '""');
      return `${field}.ilike."${esc}"`;
    })
    .join(",");
  return query.or(orExpr);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST zinciri
function applyCfTextColumnIlikeFilter(query: any, col: string, v: string): any {
  const parts = splitCfOrParts(v);
  if (!parts.length) return query;

  type Br = { pat: string };
  const branches: Br[] = [];
  for (const p of parts) {
    if (p.includes("*") || p.includes("?")) {
      branches.push({ pat: cfPatternToIlikePattern(p) });
    } else {
      branches.push({ pat: `%${p}%` });
    }
  }
  if (branches.length === 1) {
    return query.ilike(col, branches[0]!.pat);
  }
  const orExpr = branches
    .map(({ pat }) => {
      const esc = pat.replace(/"/g, '""');
      return `${col}.ilike."${esc}"`;
    })
    .join(",");
  return query.or(orExpr);
}

/** Üst bar kod kutusu: tüm DB’de son N hane (matches_with_suffix_cols görünümü gerekir). */
const KS_REF_OK = new Set(["id", "kod_ms", "kod_iy", "kod_cs", "kod_au"]);
const KS_N_OK = new Set([3, 4, 5]);

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
  let hasAnyCfParam = false;
  for (const [k, v] of sp.entries()) {
    if (k.startsWith("cf_") && v.trim()) {
      hasAnyCfParam = true;
      break;
    }
  }

  const ksRef = sp.get("ks_ref")?.trim() ?? "";
  const ksN = Number(sp.get("ks_n"));
  const ksSuffixRaw = sp.get("ks_suffix")?.trim() ?? "";
  let useKsView = false;
  let ksSuffixNum: number | null = null;
  if (
    ksRef &&
    KS_REF_OK.has(ksRef) &&
    KS_N_OK.has(ksN) &&
    /^\d+$/.test(ksSuffixRaw) &&
    ksSuffixRaw.length > 0 &&
    ksSuffixRaw.length <= ksN
  ) {
    const n = Number(ksSuffixRaw);
    if (Number.isFinite(n) && n >= 0) {
      ksSuffixNum = n;
      useKsView = true;
    }
  }

  /** Ağır filtrelerde exact COUNT ikinci tam tarama yapar → zaman aşımı; planned yaklaşık sayım */
  const countMode =
    tarihFiltParts.length > 0 || useKsView || hasAnyCfParam ? ("planned" as const) : ("exact" as const);

  const supabase = createServiceClient();
  const mergedRawCf = buildMergedRawCfColToJsonKey(await fetchRawDataKeyUnion(supabase));
  const fromTable = useKsView ? "matches_with_suffix_cols" : "matches";
  let query = supabase
    .from(fromTable)
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

  // ── Çift yönlü (⇄) arama ────────────────────────────────────────────────────
  const bidirTakim = sp.get("bidir_takim")?.trim();
  if (bidirTakim) {
    const mode = sp.get("bidir_takim_mode") || "ikisi";
    const parts = splitCfOrParts(bidirTakim);
    const pats = parts.map((p) =>
      p.includes("*") || p.includes("?") ? cfPatternToIlikePattern(p) : `%${p}%`
    );
    if (mode === "ev") {
      for (const pat of pats) query = query.ilike("t1", pat);
    } else if (mode === "dep") {
      for (const pat of pats) query = query.ilike("t2", pat);
    } else {
      const orParts = pats.flatMap((pat) => {
        const esc = pat.replace(/"/g, '""');
        return [`t1.ilike."${esc}"`, `t2.ilike."${esc}"`];
      });
      query = query.or(orParts.join(","));
    }
  }

  const bidirTakimid = sp.get("bidir_takimid")?.trim();
  if (bidirTakimid) {
    const mode = sp.get("bidir_takimid_mode") || "ikisi";
    const parts = splitCfOrParts(bidirTakimid);
    const pats = parts.map((p) =>
      p.includes("*") || p.includes("?") ? cfPatternToIlikePattern(p) : `%${p}%`
    );
    if (mode === "ev") {
      for (const pat of pats) query = query.ilike("t1i", pat);
    } else if (mode === "dep") {
      for (const pat of pats) query = query.ilike("t2i", pat);
    } else {
      const orParts = pats.flatMap((pat) => {
        const esc = pat.replace(/"/g, '""');
        return [`t1i.ilike."${esc}"`, `t2i.ilike."${esc}"`];
      });
      query = query.or(orParts.join(","));
    }
  }

  const bidirPersonel = sp.get("bidir_personel")?.trim();
  if (bidirPersonel) {
    const mode = sp.get("bidir_personel_mode") || "all";
    const parts = splitCfOrParts(bidirPersonel);
    const pats = parts.map((p) =>
      p.includes("*") || p.includes("?") ? cfPatternToIlikePattern(p) : `%${p}%`
    );
    type PersonelCols = ("hakem" | "t1_antrenor" | "t2_antrenor")[];
    const cols: PersonelCols =
      mode === "hakem" ? ["hakem"]
      : mode === "ant"  ? ["t1_antrenor", "t2_antrenor"]
      :                   ["hakem", "t1_antrenor", "t2_antrenor"];
    if (cols.length === 1) {
      for (const pat of pats) query = query.ilike(cols[0]!, pat);
    } else {
      const orParts = pats.flatMap((pat) =>
        cols.map((col) => {
          const esc = pat.replace(/"/g, '""');
          return `${col}.ilike."${esc}"`;
        })
      );
      query = query.or(orParts.join(","));
    }
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
    const v = val.trim();
    const msCol = MS_ODDS_DB_COL[colId];
    if (msCol) {
      query = applyCfTextColumnIlikeFilter(query, msCol, v);
      continue;
    }
    const def = DB_COL_MAP[colId];
    if (def) {
      if (CODE_ILIKE_ARAMA[colId]) {
        query = applyCodeColumnPatternFilter(query, colId, v);
        continue;
      }
      if (def.mode === "ilike") {
        // Wildcard içeriyorsa (* ?) pattern'ı koru; yoksa "içerir" araması yap
        if (v.includes("*") || v.includes("?")) {
          query = applyCfTextColumnIlikeFilter(query, def.col, v);
        } else {
          query = query.ilike(def.col, `%${v}%`);
        }
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
      continue;
    }
    // Çok kaynaklı OKBT: {srcId}_obktb_{idx} → PostgreSQL computed column fn
    const multiOkbtM = /^([a-z][a-z0-9]*)_obktb_(\d{1,2})$/.exec(colId);
    if (multiOkbtM) {
      const srcId = multiOkbtM[1]!;
      const idx = Number(multiOkbtM[2]);
      if (OKBT_MULTI_SOURCE_MAP[srcId] !== undefined && Number.isInteger(idx) && idx >= 0 && idx < 15) {
        const n = Number(v);
        if (Number.isFinite(n) && n >= 0) {
          query = query.eq(`${srcId}_obktb_${idx}`, Math.round(n));
        }
      }
      continue;
    }

    const jsonKey = mergedRawCf[colId];
    if (jsonKey) {
      query = applyRawJsonPathIlikeFilter(query, jsonKey, v);
    }
  }

  if (useKsView && ksSuffixNum !== null) {
    query = query.eq(`sfx_${ksRef}_${ksN}`, ksSuffixNum);
  }

  const { data, count, error } = await query
    .order("tarih", { ascending: false })
    .order("saat",  { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    const msg = [e.message, e.details, e.hint].filter(Boolean).join(" | ");
    const statementTimeout =
      e.code === "57014" ||
      /statement timeout|canceling statement due to statement timeout/i.test(msg);
    if (statementTimeout) {
      return NextResponse.json(
        {
          error:
            "Sorgu zaman aşımı. Kod sonek: create-matches-suffix-view.sql + add-matches-suffix-expression-indexes. Maç Sonucu 1/X/2: add-matches-ms-odds-trgm-indexes.sql. Ham veri (raw_data) cf_* filtreleri büyük tabloda yavaş olabilir; ilgili JSON alanları için pg_trgm / expression index veya statement_timeout artırın. CONCURRENTLY → *-concurrent.sql (psql, satır satır).",
          detail: msg,
          code: e.code,
        },
        { status: 503 }
      );
    }
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
    const missingSuffixView =
      useKsView &&
      (/matches_with_suffix_cols|relation.*does not exist|Could not find the table|schema cache/i.test(msg) ||
        (e.code === "42P01" && /matches_with_suffix_cols/i.test(msg)));
    if (missingSuffixView) {
      return NextResponse.json(
        {
          error:
            "Kod sonek araması için görünüm eksik. Supabase SQL Editor’de sql/create-matches-suffix-view.sql dosyasını çalıştırın.",
          detail: msg,
          code: e.code,
        },
        { status: 503 }
      );
    }
    const missingCodeArama =
      /id_arama|kod_ms_arama|kod_iy_arama|kod_cs_arama|kod_au_arama/i.test(msg) ||
      (e.code === "42703" && /_arama/i.test(msg));
    if (missingCodeArama) {
      return NextResponse.json(
        {
          error:
            "Jokerli maç/oyun kodu filtresi için kolonlar eksik. sql/add-matches-code-arama-columns-01-id.sql … 05 dosyalarını (tek tek; timeout’ta psql) çalıştırın; ardından create-matches-suffix-view.sql ile görünümü yenileyin.",
          detail: msg,
          code: e.code,
        },
        { status: 503 }
      );
    }
    const missingOkbtBasamak =
      /obktb_\d+/i.test(msg) &&
      (e.code === "42703" || /column .* does not exist|Could not find.*obktb/i.test(msg));
    if (missingOkbtBasamak) {
      return NextResponse.json(
        {
          error:
            "OKBT basamak (obktb_*) sütunları yok. sql/add-matches-okbt-basamak-generated-cols.sql çalıştırın; kod sonek görünümü kullanıyorsanız create-matches-suffix-view.sql ile yenileyin.",
          detail: msg,
          code: e.code,
        },
        { status: 503 }
      );
    }
    const missingMultiOkbt =
      /_(obktb|obkt)_\d+/i.test(msg) &&
      (e.code === "42883" || /function.*does not exist|Could not find.*function/i.test(msg));
    if (missingMultiOkbt) {
      return NextResponse.json(
        {
          error:
            "Çok kaynaklı OKBT fonksiyonları (kodms_obktb_0 vb.) henüz oluşturulmamış. sql/add-matches-okbt-multi-computed-col-functions.sql dosyasını Supabase SQL Editor'de çalıştırın.",
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
