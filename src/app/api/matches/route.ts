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

/** "," → OR parçalarına böl. */
function splitOrParts(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

/** "+" → AND parçalarına böl. */
function splitAndParts(v: string): string[] {
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

// ─── Genel filtre parser ───────────────────────────────────────────────────

type FilterBranch =
  | { kind: "like";    pat: string }
  | { kind: "ilike";   pat: string }
  | { kind: "eq";      val: string }
  | { kind: "neq";     val: string }
  | { kind: "gt";      val: string }
  | { kind: "gte";     val: string }
  | { kind: "lt";      val: string }
  | { kind: "lte";     val: string }
  | { kind: "between"; lo: string; hi: string };

/**
 * Tek bir parçayı (joker / karşılaştırma / aralık / sade değer) parse eder.
 * defaultWrap: sade değer için "prefix" → val% (kodlar), "contains" → %val% (metin).
 */
function parseFilterBranch(p: string, defaultWrap: "prefix" | "contains" = "prefix"): FilterBranch {
  const t = p.trim();
  if (t.startsWith(">=")) return { kind: "gte", val: t.slice(2).trim() };
  if (t.startsWith("<=")) return { kind: "lte", val: t.slice(2).trim() };
  if (t.startsWith("<>")) return { kind: "neq", val: t.slice(2).trim() };
  if (t.startsWith(">"))  return { kind: "gt",  val: t.slice(1).trim() };
  if (t.startsWith("<"))  return { kind: "lt",  val: t.slice(1).trim() };
  // Aralık: 10..20 veya 10<->20 (AÇIK ayraçlar).
  // NOT: Bare dash (ör. "1-0", "2-1") ARTIK aralık sayılmaz — skor/kod/mbs gibi
  // alanlarda dash doğal olarak yer aldığından yanlış BETWEEN yorumu yapıp boş
  // sonuç döndürüyordu. Gerçek sayısal aralık için ".." veya "<->" kullanılmalı.
  const rm = t.match(/^(\d[\d.]*)\s*(?:\.\.|\<-\>)\s*(\d[\d.]*)$/);
  if (rm) return { kind: "between", lo: rm[1]!, hi: rm[2]! };
  // Joker — contains modunda her zaman ilike (büyük/küçük harf duyarsız)
  if (t.includes("*") || t.includes("?")) {
    const pat = cfPatternToIlikePattern(t);
    return { kind: (pat.startsWith("%") || defaultWrap === "contains") ? "ilike" : "like", pat };
  }
  // Sade değer
  if (defaultWrap === "prefix")   return { kind: "like", pat: `${t}%` };
  return { kind: "ilike", pat: `%${t}%` };
}

/** PostgREST or() ifadesi için string. BETWEEN: and(gte,lte) iç grup kullanır. */
function branchToOrStr(field: string, b: FilterBranch): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  switch (b.kind) {
    case "like":    return `${field}.like.${q(b.pat)}`;
    case "ilike":   return `${field}.ilike.${q(b.pat)}`;
    case "eq":      return `${field}.eq.${q(b.val)}`;
    case "neq":     return `${field}.neq.${q(b.val)}`;
    case "gt":      return `${field}.gt.${q(b.val)}`;
    case "gte":     return `${field}.gte.${q(b.val)}`;
    case "lt":      return `${field}.lt.${q(b.val)}`;
    case "lte":     return `${field}.lte.${q(b.val)}`;
    case "between": return `and(${field}.gte.${q(b.lo)},${field}.lte.${q(b.hi)})`;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyBranchDirect(q: any, field: string, b: FilterBranch): any {
  switch (b.kind) {
    case "like":    return q.like(field, b.pat);
    case "ilike":   return q.ilike(field, b.pat);
    case "eq":      return q.eq(field, b.val);
    case "neq":     return q.neq(field, b.val);
    case "gt":      return q.gt(field, b.val);
    case "gte":     return q.gte(field, b.val);
    case "lt":      return q.lt(field, b.val);
    case "lte":     return q.lte(field, b.val);
    case "between": return q.gte(field, b.lo).lte(field, b.hi);
  }
}

/**
 * Genel filtre uygulayıcı: "," → OR, "+" → AND.
 * field: PostgREST sütun ifadesi (ör: "lig_adi", "raw_data->>KODAU45")
 * defaultWrap: joker/op olmayan değer için sarma biçimi
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyGenericFilter(
  query: any,
  field: string,
  v: string,
  defaultWrap: "prefix" | "contains" = "prefix"
): any {
  const orParts = splitOrParts(v);
  if (!orParts.length) return query;

  if (orParts.length === 1) {
    // Tek OR → AND zincirleri doğrudan uygula
    for (const ap of splitAndParts(orParts[0]!)) {
      query = applyBranchDirect(query, field, parseFilterBranch(ap, defaultWrap));
    }
    return query;
  }

  // Birden fazla OR → or() ifadesi
  const segments: string[] = [];
  for (const orPart of orParts) {
    const andParts = splitAndParts(orPart);
    if (andParts.length === 1) {
      segments.push(branchToOrStr(field, parseFilterBranch(andParts[0]!, defaultWrap)));
    } else {
      // AND grubu or() içinde: and(cond1,cond2,...)
      const andExprs = andParts.map((ap) => branchToOrStr(field, parseFilterBranch(ap, defaultWrap)));
      segments.push(`and(${andExprs.join(",")})`);
    }
  }
  return query.or(segments.join(","));
}

/**
 * cf_* tam sayı sütunları: sadece rakam → .eq; * ? joker → GENERATED *_arama üzerinde ilike.
 * PostgREST yatay filtrede integer::text cast yok (t1i_arama ile aynı desen; sql/add-matches-integer-id-arama-columns.sql).
 */
const INTEGER_CF_ILIKE_ARAMA: Record<string, string> = {
  lig_id: "lig_id_arama",
  alt_lig_id: "alt_lig_id_arama",
  sezon_id: "sezon_id_arama",
  bookmaker_id: "bookmaker_id_arama",
  t1i: "t1i_arama",
  t2i: "t2i_arama",
};
const INTEGER_EQ_CF_COLS = new Set(Object.keys(INTEGER_CF_ILIKE_ARAMA));

/**
 * Tam sayı sütun filtresi — karşılaştırma, aralık ve OR/AND destekli.
 * Joker/metin → _arama sütununda; sayısal op → col'da gerçek integer karşılaştırması.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST zinciri
function applyCfIntegerEqColumnFilter(query: any, col: string, v: string): any {
  const t = v.trim();
  if (!t) return query;
  const arama = INTEGER_CF_ILIKE_ARAMA[col];

  const orParts = splitOrParts(t);
  if (!orParts.length) return query;

  // Tüm OR parçaları saf tam sayı ise → .in() ile hızlı çok-değer
  const allPureInt = orParts.length > 1 && orParts.every((p) => /^\d+$/.test(p.trim()));
  if (allPureInt) {
    return query.in(col, orParts.map((p) => Number(p.trim())));
  }

  const applyOne = (q: any, p: string): any => {
    const b = parseFilterBranch(p.trim(), "prefix");
    if (b.kind === "like" || b.kind === "ilike") {
      // Joker → _arama metin sütunu
      return arama ? q[b.kind](arama, b.pat) : q;
    }
    if (b.kind === "between") {
      const lo = Number(b.lo), hi = Number(b.hi);
      return Number.isFinite(lo) && Number.isFinite(hi) ? q.gte(col, lo).lte(col, hi) : q;
    }
    if (b.kind === "eq" || b.kind === "neq" || b.kind === "gt" || b.kind === "gte" || b.kind === "lt" || b.kind === "lte") {
      const n = Number(b.val);
      return Number.isFinite(n) ? q[b.kind](col, n) : (arama ? q.ilike(arama, `%${b.val}%`) : q);
    }
    return q;
  };

  const branchStr = (p: string): string => {
    const b = parseFilterBranch(p.trim(), "prefix");
    if (b.kind === "like" || b.kind === "ilike") {
      return arama ? `${arama}.${b.kind}."${b.pat.replace(/"/g, '""')}"` : "";
    }
    if (b.kind === "between") return `and(${col}.gte.${b.lo},${col}.lte.${b.hi})`;
    const n = Number((b as { val: string }).val);
    return Number.isFinite(n) ? `${col}.${b.kind}.${n}` : "";
  };

  if (orParts.length === 1) {
    for (const ap of splitAndParts(orParts[0]!)) query = applyOne(query, ap);
    return query;
  }

  const segments = orParts.map((orPart) => {
    const ands = splitAndParts(orPart);
    if (ands.length === 1) return branchStr(ands[0]!);
    const exprs = ands.map(branchStr).filter(Boolean);
    return exprs.length > 1 ? `and(${exprs.join(",")})` : exprs[0] ?? "";
  }).filter(Boolean);

  return segments.length ? query.or(segments.join(",")) : query;
}

/**
 * Kod sütun filtresi (kod_ms, kod_iy, vs.) — OR/AND/karşılaştırma/aralık/joker.
 * Saf tam sayı → integer col üzerinde eq/gt/gte/lt/lte/neq/between;
 * joker/metin → _arama metin sütununda.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST zinciri
function applyCodeColumnPatternFilter(query: any, colId: string, v: string): any {
  const arama = CODE_ILIKE_ARAMA[colId];
  const def = DB_COL_MAP[colId];
  if (!arama || !def) return query;

  const orParts = splitOrParts(v);
  if (!orParts.length) return query;

  const col = def.col;

  const applyOne = (q: any, p: string): any => {
    const b = parseFilterBranch(p.trim(), "prefix");
    if (b.kind === "like" || b.kind === "ilike") return q[b.kind](arama, b.pat);
    if (b.kind === "between") {
      const lo = Number(b.lo), hi = Number(b.hi);
      return Number.isFinite(lo) && Number.isFinite(hi) ? q.gte(col, lo).lte(col, hi) : q;
    }
    const n = Number((b as { val: string }).val);
    return Number.isFinite(n) ? q[b.kind](col, n) : q.ilike(arama, `%${(b as { val: string }).val}%`);
  };

  const branchStr = (p: string): string => {
    const b = parseFilterBranch(p.trim(), "prefix");
    if (b.kind === "like" || b.kind === "ilike") return `${arama}.${b.kind}."${b.pat.replace(/"/g, '""')}"`;
    if (b.kind === "between") return `and(${col}.gte.${b.lo},${col}.lte.${b.hi})`;
    const n = Number((b as { val: string }).val);
    return Number.isFinite(n) ? `${col}.${b.kind}.${n}` : "";
  };

  // Tüm parçalar saf tam sayı → .in()
  if (orParts.length > 1 && orParts.every((p) => /^\d+$/.test(p.trim()))) {
    return query.in(col, orParts.map((p) => Number(p.trim())));
  }

  if (orParts.length === 1) {
    for (const ap of splitAndParts(orParts[0]!)) query = applyOne(query, ap);
    return query;
  }

  const segments = orParts.map((orPart) => {
    const ands = splitAndParts(orPart);
    if (ands.length === 1) return branchStr(ands[0]!);
    const exprs = ands.map(branchStr).filter(Boolean);
    return exprs.length > 1 ? `and(${exprs.join(",")})` : exprs[0] ?? "";
  }).filter(Boolean);

  return segments.length ? query.or(segments.join(",")) : query;
}

/** Ham veri alan adı: PostgREST ifadesi için güvenli anahtar. */
const SAFE_RAW_JSON_KEY = /^[A-Za-z0-9_]+$/;

/**
 * Filtre değeri tek bir basit leading-wildcard ilike ise o pattern'i döndürür.
 * Ör: "*7987*" → "%7987%", "*abc" → "%abc"
 * OR (,) veya AND (+) içeriyorsa → null (karmaşık: eski yol kullanılır).
 */
function getSimpleIlikePattern(v: string): string | null {
  const orParts = splitOrParts(v);
  if (orParts.length !== 1) return null;
  const andParts = splitAndParts(orParts[0]!);
  if (andParts.length !== 1) return null;
  const b = parseFilterBranch(andParts[0]!.trim(), "prefix");
  return b.kind === "ilike" ? b.pat : null;
}

/** Maç Sonucu 1 / X / 2 — matches.ms1 / msx / ms2 (şema sütunu; raw_data JSON değil, daha hızlı). */
const MS_ODDS_DB_COL: Record<string, "ms1" | "msx" | "ms2"> = {
  ms1: "ms1",
  msx: "msx",
  ms2: "ms2",
};

const RAW_KEY_CACHE_MS = 10 * 60 * 1000;
let rawKeyUnionCache: { keys: string[]; fetchedAt: number } | null = null;

async function fetchRawDataKeyUnion(
  supabase: ReturnType<typeof createServiceClient>
): Promise<string[]> {
  const now = Date.now();
  if (rawKeyUnionCache && now - rawKeyUnionCache.fetchedAt < RAW_KEY_CACHE_MS) {
    return rawKeyUnionCache.keys;
  }
  // get_raw_data_keys(): son 5 satırdan DISTINCT jsonb key'leri döndürür — ~20KB transfer, <1ms
  const { data, error } = await supabase.rpc("get_raw_data_keys");
  if (error || !data) {
    return rawKeyUnionCache?.keys ?? [];
  }
  const arr = (data as string[]).filter((k) => !isRawKeyExcludedFromColumns(k));
  rawKeyUnionCache = { keys: arr, fetchedAt: now };
  return arr;
}

function buildMergedRawCfColToJsonKey(rawKeyUnion: string[]): Record<string, string> {
  const base = { ...staticCfRawJsonKeyByColId() };
  for (const id of Object.keys(MS_ODDS_DB_COL)) delete base[id];
  const dyn = dynamicRawColIdToJsonKey(rawKeyUnion);
  return { ...base, ...dyn };
}

/**
 * Ham veri (raw_data) alan filtresi — OR/AND/karşılaştırma/aralık/joker destekli.
 * Sade değer → LIKE 'val%' (ile başlar) → btree text_pattern_ops index kullanır.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST zinciri
function applyRawJsonPathIlikeFilter(query: any, jsonKey: string, v: string): any {
  if (!SAFE_RAW_JSON_KEY.test(jsonKey)) return query;
  return applyGenericFilter(query, `raw_data->>${jsonKey}`, v, "prefix");
}

/**
 * Metin sütun filtresi — OR/AND/karşılaştırma/aralık/joker destekli.
 * Sade değer → ILIKE '%val%' (içerir) → kullanıcı dostu metin arama.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST zinciri
function applyCfTextColumnIlikeFilter(query: any, col: string, v: string): any {
  return applyGenericFilter(query, col, v, "contains");
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

  // ── Herhangi bir KOD sütunu son hane filtresi (panel seçimi) ─────────────
  const ksAnySuffixRaw = sp.get("ks_any_suffix")?.trim() ?? "";
  const ksAnyN = Number(sp.get("ks_any_n") ?? 3);
  let ksAnyFilterIds: number[] | null = null;

  /** Ağır filtrelerde exact COUNT ikinci tam tarama yapar → zaman aşımı; planned yaklaşık sayım */
  const countMode =
    tarihFiltParts.length > 0 || useKsView || hasAnyCfParam || !!ksAnySuffixRaw ? ("planned" as const) : ("exact" as const);

  const supabase = createServiceClient();
  const mergedRawCf = buildMergedRawCfColToJsonKey(await fetchRawDataKeyUnion(supabase));

  // ks_any_suffix: herhangi bir KOD sütununun son N hanesi eşleşen maçlar
  if (
    /^\d+$/.test(ksAnySuffixRaw) &&
    ksAnySuffixRaw.length > 0 &&
    KS_N_OK.has(ksAnyN)
  ) {
    const suffixNum = Number(ksAnySuffixRaw);
    const { data: idData } = await supabase.rpc("get_matches_by_kod_suffix", {
      p_suffix: suffixNum,
      p_n: ksAnyN,
    });
    ksAnyFilterIds = (idData as number[] | null) ?? [];
  }

  // ── Ham veri leading-wildcard ön-filtre ──────────────────────────────────────
  // ORDER BY tarih ile birlikte leading-% ILIKE planner'ı tarih index'ini seçmeye
  // zorlar (397k satır tam tarama, ~67s). Çözüm: önce trgm index ile ID'leri al
  // (ORDER BY yok → 55ms), sonra ana sorguda WHERE id IN (...) kullan.
  const preFilterColIds = new Set<string>(); // bu col'ları ana döngüde atla
  const idSetsForIntersect: number[][] = [];

  for (const [k, v] of sp.entries()) {
    if (!k.startsWith("cf_")) continue;
    const colId = k.slice(3);
    const jsonKey = mergedRawCf[colId];
    if (!jsonKey || !SAFE_RAW_JSON_KEY.test(jsonKey)) continue;
    const ilikePattern = getSimpleIlikePattern(v.trim());
    if (!ilikePattern) continue; // OR/AND karmaşığı → eski yol

    preFilterColIds.add(colId);
    // get_matches_raw_ilike_ids: ORDER BY olmadan trgm index kullanır
    const { data: idsData } = await supabase.rpc("get_matches_raw_ilike_ids", {
      json_key: jsonKey,
      ilike_pattern: ilikePattern,
    });
    const ids = (idsData as number[] | null) ?? [];
    idSetsForIntersect.push(ids);
  }

  // Birden fazla leading-wildcard kolonu: AND semantiği → kesişim (intersection)
  let preFilteredIds: number[] | null = null;
  if (idSetsForIntersect.length > 0) {
    let combined = idSetsForIntersect[0]!;
    for (let i = 1; i < idSetsForIntersect.length; i++) {
      const s = new Set(idSetsForIntersect[i]);
      combined = combined.filter((id) => s.has(id));
    }
    preFilteredIds = combined;
  }

  const fromTable = useKsView ? "matches_with_suffix_cols" : "matches";
  let query = supabase
    .from(fromTable)
    .select(DB_COLS.join(","), { count: countMode });

  // Sıfır eşleşme → hemen boş dön
  if (preFilteredIds !== null && preFilteredIds.length === 0) {
    return NextResponse.json({ data: [], page, limit, total: 0, totalPages: 0 });
  }
  if (preFilteredIds !== null) {
    query = query.in("id", preFilteredIds);
  }

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

  /** DD.MM.YYYY metin `tarih_arama` üzerinde: gün / ay / yıl ayrı VE ile; üçünü birden tam gün → `tarih` aralığı. */
  const padTarihPart = (raw: string, max: number): string => {
    const n = Number(raw.trim());
    if (!Number.isFinite(n) || n < 1 || n > max) return "";
    return String(n).padStart(2, "0");
  };
  const tgRaw = sp.get("tarih_gun")?.trim() ?? "";
  const taRaw = sp.get("tarih_ay")?.trim() ?? "";
  const tyRaw = sp.get("tarih_yil")?.trim() ?? "";
  if (tgRaw || taRaw || tyRaw) {
    const g = tgRaw ? padTarihPart(tgRaw, 31) : "";
    const a = taRaw ? padTarihPart(taRaw, 12) : "";
    const yOk = /^\d{4}$/.test(tyRaw);
    const yNum = yOk ? Number(tyRaw) : NaN;
    const y =
      Number.isFinite(yNum) && yNum >= 1900 && yNum <= 2100 ? tyRaw : "";

    if (g && a && y) {
      const di = Number(g);
      const mi = Number(a);
      const yi = Number(y);
      const last = new Date(yi, mi, 0).getDate();
      const day = Math.min(di, last);
      const iso = `${y}-${String(mi).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      query = query.gte("tarih", iso).lte("tarih", iso);
    } else {
      if (g) query = query.ilike("tarih_arama", `${g}.%`);
      if (a) query = query.ilike("tarih_arama", `%.${a}.%`);
      if (y) query = query.ilike("tarih_arama", `%${y}`);
    }
  }

  if (sp.get("lig"))        query = query.ilike("lig_adi", `%${sp.get("lig")}%`);
  if (sp.get("alt_lig"))    query = query.ilike("alt_lig_adi", `%${sp.get("alt_lig")}%`);
  if (sp.get("takim")) {
    const raw = `%${sp.get("takim")}%`;
    const esc = raw.replace(/"/g, '""');
    query = query.or(`t1.ilike."${esc}",t2.ilike."${esc}"`);
  }

  // ── Çift yönlü (⇄) arama ────────────────────────────────────────────────────
  const bidirTakimEv = sp.get("bidir_takim_ev")?.trim() ?? "";
  const bidirTakimDep = sp.get("bidir_takim_dep")?.trim() ?? "";
  const bidirTakimLegacy = sp.get("bidir_takim")?.trim();

  /** Tek takim sütunu için genel filtre (contains modu). */
  const applyBidirTakimIlikes = (col: "t1" | "t2", raw: string) => {
    query = applyGenericFilter(query, col, raw, "contains");
  };

  if (bidirTakimEv || bidirTakimDep) {
    if (bidirTakimEv) applyBidirTakimIlikes("t1", bidirTakimEv);
    if (bidirTakimDep) applyBidirTakimIlikes("t2", bidirTakimDep);
  } else if (bidirTakimLegacy) {
    const mode = sp.get("bidir_takim_mode") || "ikisi";
    if (mode === "ev") {
      query = applyGenericFilter(query, "t1", bidirTakimLegacy, "contains");
    } else if (mode === "dep") {
      query = applyGenericFilter(query, "t2", bidirTakimLegacy, "contains");
    } else {
      // "ikisi": (t1 veya t2)'de OR — her OR grubu hem t1 hem t2'ye yayılır
      const orParts = splitOrParts(bidirTakimLegacy);
      const orSegments = orParts.flatMap((orPart) => {
        const andParts = splitAndParts(orPart);
        const buildContainsPat = (p: string) =>
          p.includes("*") || p.includes("?") ? cfPatternToIlikePattern(p) : `%${p}%`;
        if (andParts.length === 1) {
          const pat = buildContainsPat(andParts[0]!);
          const esc = pat.replace(/"/g, '""');
          return [`t1.ilike."${esc}"`, `t2.ilike."${esc}"`];
        }
        // AND grubu: and(t1.ilike.X,t1.ilike.Y)
        const t1andExprs = andParts.map((ap) => {
          const pat = buildContainsPat(ap);
          return `t1.ilike."${pat.replace(/"/g, '""')}"`;
        });
        const t2andExprs = andParts.map((ap) => {
          const pat = buildContainsPat(ap);
          return `t2.ilike."${pat.replace(/"/g, '""')}"`;
        });
        return [`and(${t1andExprs.join(",")})`, `and(${t2andExprs.join(",")})`];
      });
      if (orSegments.length) query = query.or(orSegments.join(","));
    }
  }

  const bidirTakimidEv = sp.get("bidir_takimid_ev")?.trim() ?? "";
  const bidirTakimidDep = sp.get("bidir_takimid_dep")?.trim() ?? "";
  const bidirTakimidLegacy = sp.get("bidir_takimid")?.trim();

  /** Takım ID sütunu — sayısal karşılaştırma/aralık/OR/AND destekli. */
  const applyBidirTakimidSide = (side: "ev" | "dep", raw: string) => {
    const col = side === "ev" ? "t1i" : "t2i";
    query = applyCfIntegerEqColumnFilter(query, col, raw);
  };

  if (bidirTakimidEv || bidirTakimidDep) {
    if (bidirTakimidEv) applyBidirTakimidSide("ev", bidirTakimidEv);
    if (bidirTakimidDep) applyBidirTakimidSide("dep", bidirTakimidDep);
  } else if (bidirTakimidLegacy) {
    const mode = sp.get("bidir_takimid_mode") || "ikisi";
    if (mode === "ev") {
      query = applyCfIntegerEqColumnFilter(query, "t1i", bidirTakimidLegacy);
    } else if (mode === "dep") {
      query = applyCfIntegerEqColumnFilter(query, "t2i", bidirTakimidLegacy);
    } else {
      // "ikisi": (t1i veya t2i)'de OR
      const orParts = splitOrParts(bidirTakimidLegacy);
      const idSegments = orParts.flatMap((p) => {
        const b = parseFilterBranch(p.trim(), "prefix");
        if (b.kind === "like" || b.kind === "ilike") {
          const esc = b.pat.replace(/"/g, '""');
          return [`t1i_arama.${b.kind}."${esc}"`, `t2i_arama.${b.kind}."${esc}"`];
        }
        if (b.kind === "between") {
          return [`and(t1i.gte.${b.lo},t1i.lte.${b.hi})`, `and(t2i.gte.${b.lo},t2i.lte.${b.hi})`];
        }
        const val = (b as { val: string }).val;
        const n = Number(val);
        return Number.isFinite(n)
          ? [`t1i.${b.kind}.${n}`, `t2i.${b.kind}.${n}`]
          : [];
      });
      if (idSegments.length) query = query.or(idSegments.join(","));
    }
  }

  const bidirHakem = sp.get("bidir_hakem")?.trim() ?? "";
  const bidirAntEv = sp.get("bidir_ant_ev")?.trim() ?? "";
  const bidirAntDep = sp.get("bidir_ant_dep")?.trim() ?? "";
  const bidirAntLegacy = sp.get("bidir_ant")?.trim();
  const bidirPersonelLegacy = sp.get("bidir_personel")?.trim();

  /**
   * Personel sütunları filtresi — OR/AND/joker destekli.
   * Tek sütun: doğrudan applyGenericFilter; çok sütun: her OR parçası tüm sütunlara yayılır.
   */
  const applyBidirPersonelPats = (cols: ("hakem" | "t1_antrenor" | "t2_antrenor")[], raw: string) => {
    if (cols.length === 1) {
      query = applyGenericFilter(query, cols[0]!, raw, "contains");
      return;
    }
    const orParts = splitOrParts(raw);
    if (!orParts.length) return;
    const makePat = (p: string) =>
      p.includes("*") || p.includes("?") ? cfPatternToIlikePattern(p) : `%${p}%`;
    const orSegments = orParts.flatMap((orPart) => {
      const andParts = splitAndParts(orPart);
      if (andParts.length === 1) {
        const pat = makePat(andParts[0]!);
        const esc = pat.replace(/"/g, '""');
        return cols.map((col) => `${col}.ilike."${esc}"`);
      }
      return cols.map((col) => {
        const exprs = andParts.map((ap) => {
          const pat = makePat(ap);
          return `${col}.ilike."${pat.replace(/"/g, '""')}"`;
        });
        return `and(${exprs.join(",")})`;
      });
    });
    if (orSegments.length) query = query.or(orSegments.join(","));
  };

  if (bidirHakem || bidirAntEv || bidirAntDep || bidirAntLegacy) {
    if (bidirHakem) applyBidirPersonelPats(["hakem"], bidirHakem);
    if (bidirAntEv) applyBidirPersonelPats(["t1_antrenor"], bidirAntEv);
    if (bidirAntDep) applyBidirPersonelPats(["t2_antrenor"], bidirAntDep);
    // Ev veya dep TD'de eşleşme (OR); ev/dep ayrı kutularla birlikte VE ile birleşir.
    if (bidirAntLegacy) applyBidirPersonelPats(["t1_antrenor", "t2_antrenor"], bidirAntLegacy);
  } else if (bidirPersonelLegacy) {
    const mode = sp.get("bidir_personel_mode") || "all";
    type PersonelCols = ("hakem" | "t1_antrenor" | "t2_antrenor")[];
    const cols: PersonelCols =
      mode === "hakem" ? ["hakem"]
      : mode === "ant"  ? ["t1_antrenor", "t2_antrenor"]
      :                   ["hakem", "t1_antrenor", "t2_antrenor"];
    applyBidirPersonelPats(cols, bidirPersonelLegacy);
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
        query = applyCfTextColumnIlikeFilter(query, def.col, v);
      } else if (def.mode === "eq") {
        // id (bigint) için özel: sayıya çevir; tam sayı kimlik sütunlarında joker → ::text ilike
        if (def.col === "id") {
          query = applyGenericFilter(query, def.col, v, "prefix");
        } else if (INTEGER_EQ_CF_COLS.has(def.col)) {
          query = applyCfIntegerEqColumnFilter(query, def.col, v);
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
      if (preFilterColIds.has(colId)) continue; // leading-wildcard → zaten id IN ile filtrelendi
      query = applyRawJsonPathIlikeFilter(query, jsonKey, v);
    }
  }

  if (useKsView && ksSuffixNum !== null) {
    query = query.eq(`sfx_${ksRef}_${ksN}`, ksSuffixNum);
  }

  if (ksAnyFilterIds !== null) {
    if (ksAnyFilterIds.length === 0) {
      // Hiç eşleşme yok — boş sonuç
      query = query.in("id", [-1]);
    } else {
      query = query.in("id", ksAnyFilterIds);
    }
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
    const missingIntegerIdArama =
      /lig_id_arama|alt_lig_id_arama|sezon_id_arama|bookmaker_id_arama/i.test(msg) ||
      (e.code === "42703" &&
        /lig_id_arama|alt_lig_id_arama|sezon_id_arama|bookmaker_id_arama/i.test(msg)) ||
      /schema cache.*lig_id_arama|Could not find.*lig_id_arama/i.test(msg);
    if (missingIntegerIdArama) {
      return NextResponse.json(
        {
          error:
            "Lig / alt lig / sezon / bookmaker ID jokerli arama için lig_id_arama, alt_lig_id_arama, sezon_id_arama, bookmaker_id_arama kolonları gerekli. sql/add-matches-integer-id-arama-columns.sql dosyasını çalıştırın; kod sonek görünümü kullanıyorsanız create-matches-suffix-view.sql ile görünümü yenileyin.",
          detail: msg,
          code: e.code,
        },
        { status: 503 }
      );
    }
    const missingTakimidArama =
      /t1i_arama|t2i_arama/i.test(msg) ||
      (e.code === "42703" && /t1i_arama|t2i_arama/i.test(msg)) ||
      /schema cache.*t1i_arama|Could not find.*t1i_arama/i.test(msg);
    if (missingTakimidArama) {
      return NextResponse.json(
        {
          error:
            "T-ID jokerli arama için t1i_arama / t2i_arama kolonları gerekli. sql/add-matches-t1i-t2i-arama-columns.sql dosyasını çalıştırın; kod sonek görünümü kullanıyorsanız create-matches-suffix-view.sql ile görünümü yenileyin. (Sadece rakam T-ID: bu SQL olmadan da .eq ile çalışır.)",
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
    // raw_data'yı koru (panel için lazım), ama içindeki alanları da düzleştir
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
