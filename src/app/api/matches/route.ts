import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  dynamicRawColIdToJsonKey,
  isRawKeyExcludedFromColumns,
  staticCfRawJsonKeyByColId,
} from "@/lib/columns";
import { OKBT_BASAMAK_LABELS } from "@/lib/okbt-basamak-toplamlari";
import {
  normalizeTarihFilterInput,
  splitTarihOrPatterns,
  tarihPartToIlike,
} from "@/lib/tarih-pattern";
import {
  expandOkbtWildcardFilter,
  normalizeOkbtCfInput,
  type OkbtWildcardExpand,
} from "@/lib/okbt-wildcard-server-expand";
import { parsePlainSkorTokenWithBlankSuffix } from "@/lib/score-filter-parse";
import {
  isRawFiveDigitPaddedKodJsonKey,
  normalizeCfPipelineBeforeApi,
  rawKodJsonWildcardPadLen,
} from "@/lib/kod-format";

/** Tarih ILIKE + büyük tablo: exact count ağır; planned + süre sınırı zaman aşımını azaltır. */
/** KOD* sonek RPC tam tablo taraması uzun sürebilir; Vercel planda üst sınırı aşarsanız düşürün. */
export const maxDuration = 300;

/**
 * PostgREST `.range(offset, …)` büyük `OFFSET` değerlerinde Postgres’te çok pahalı olabilir
 * (özellikle `ORDER BY tarih, saat` ile) ve Supabase `statement_timeout` (57014) yiyebilir.
 * UI’daki `»»` (son sayfaya atla) tam da bunu tetikler.
 *
 * Not: Bu sınır “doğru sonuç”u engellemez; yalnızca aşırı derin sayfalamayı erken keser.
 * Daha derin sayfalar için tarih/lig ile küçültün veya cursor-tabanlı sayfalama ekleyin.
 */
const MAX_RANGE_OFFSET = 100_000;

/**
 * GET + select(..., { count }) ile gelen count bazen (özellikle uzun select / gateway)
 * 1000’de takılı kalabiliyor. Aynı filtre URL’siyle HEAD + Prefer: count=… ile
 * Content-Range üst bilgisindeki toplam satır sayısı (PostgREST resmi yolu).
 */
type PostgrestUrlCarrier = { url: URL; headers: Headers };

async function postgrestHeadRowCount(
  q: PostgrestUrlCarrier,
  countPrefer: "exact" | "planned"
): Promise<number | null> {
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!sk) return null;
  const url = new URL(q.url.toString());
  url.searchParams.delete("offset");
  url.searchParams.delete("limit");
  url.searchParams.delete("order");
  const headers = new Headers();
  headers.set("apikey", sk);
  headers.set("Authorization", `Bearer ${sk}`);
  headers.set("Prefer", `count=${countPrefer}`);
  headers.set("Accept", "application/json");
  const profile = q.headers.get("Accept-Profile") ?? q.headers.get("accept-profile");
  if (profile) headers.set("Accept-Profile", profile);
  try {
    const res = await fetch(url.toString(), { method: "HEAD", headers });
    if (!res.ok) return null;
    const cr = res.headers.get("content-range") ?? res.headers.get("Content-Range");
    if (!cr) return null;
    const tail = cr.split("/")[1]?.trim();
    if (!tail || tail === "*") return null;
    const n = parseInt(tail, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** PostgREST `or=(…)` parametresi — proxy / sunucu URL sınırı için üst sınır (güvenli marj). */
const KS_ANY_OR_MAX_LEN = 5200;

function buildKsAnyIdInOrParts(ids: number[], chunkSize: number): string[] {
  const parts: string[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    parts.push(`id.in.(${ids.slice(i, i + chunkSize).join(",")})`);
  }
  return parts;
}

function ksAnyOrJoinedLength(ids: number[], chunkSize: number): number {
  return buildKsAnyIdInOrParts(ids, chunkSize).join(",").length;
}

/** Tek `or=(id.in…,…)` parametresi KS_ANY_OR_MAX_LEN içinde kalacak şekilde parçalanabiliyor mu? */
function ksAnyIdListFitsPostgrestUrl(idsRaw: unknown[]): boolean {
  const ids = [
    ...new Set(
      idsRaw
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n)),
    ),
  ] as number[];
  if (ids.length <= 1) return true;
  return findKsAnyOrChunkSize(ids) != null;
}

/**
 * KOD* son N (ks_any_*): RPC çok id döndürünce tek `id.in.(…)` URL’yi taşır.
 * En büyük mümkün `chunkSize` ile `id.in.(chunk)` parçalarını `or` ile birleştirir
 * (PostgREST `or=(a,b,c)` — supabase `.or("a,b,c")` dış parantezi kendisi ekler).
 *
 * Parçalanamazsa `null`: tek dev `id.in.(…)` PostgREST/proxy’de 400 Bad Request üretir;
 * çağıran doğrudan sütun/RPC yoluna düşmelidir.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyKsAnyIdListFilter(query: any, idsRaw: unknown[]): any | null {
  const ids = [
    ...new Set(
      idsRaw
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n)),
    ),
  ] as number[];
  if (!ids.length) return query.in("id", [-1]);
  if (ids.length === 1) return query.in("id", ids);

  const bestChunk = findKsAnyOrChunkSize(ids);
  if (bestChunk == null) {
    return null;
  }
  const parts = buildKsAnyIdInOrParts(ids, bestChunk);
  if (parts.length === 1) return query.in("id", ids);
  return query.or(parts.join(","));
}

type MatchesServiceClient = ReturnType<typeof createServiceClient>;

/**
 * PostgREST filtre zinciri `.then` ile thenable olduğundan, `async` fonksiyondan doğrudan `return builder`
 * zinciri **erken çalıştırır** ve `{ data, error }` döner (`.order` kaybolur). Taşımak için kutula.
 */
const POSTGREST_CHAIN_BOX = Symbol.for("oranexcel.postgrestChain");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function boxPostgrestChain(q: any): any {
  return { [POSTGREST_CHAIN_BOX]: true as const, q };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unboxPostgrestChain(x: any): any {
  if (x != null && typeof x === "object" && (x as Record<symbol, unknown>)[POSTGREST_CHAIN_BOX] === true) {
    return (x as { q: any }).q;
  }
  return x;
}

/** Padlenmiş KOD eşleşmesi: RPC id listesi → ana sorguda id IN / or(id.in…). Hata → null (üst katman düşer). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rpcPaddedKodPatternToQuery(
  query: any,
  supabase: MatchesServiceClient,
  rpc: "get_matches_raw_kod_padded_pattern_ids" | "get_matches_schema_kod_padded_pattern_ids",
  args: Record<string, unknown>
): Promise<any | null> {
  const { data, error } = await supabase.rpc(rpc, args);
  if (error) return null;
  const ids = normalizeRpcIdArray(data);
  if (!ids.length) return boxPostgrestChain(query.in("id", [-1]));
  if (!ksAnyIdListFitsPostgrestUrl(ids)) return null;
  const chained = applyKsAnyIdListFilter(query, ids);
  if (chained == null) return null;
  return boxPostgrestChain(chained);
}

/** id / kod_*: tek atom `*23` → `%23`; padlenmiş metin üzerinde (5 veya 7 hane). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tryApplySchemaKodPaddedSuffixRpc(
  query: any,
  supabase: MatchesServiceClient,
  schemaCol: "id" | "kod_ms" | "kod_iy" | "kod_cs" | "kod_au",
  rawFilterValue: string
): Promise<any | null> {
  const suf = getSimplePaddedKodSuffixWildcard(rawFilterValue);
  if (!suf) return null;
  return rpcPaddedKodPatternToQuery(query, supabase, "get_matches_schema_kod_padded_pattern_ids", {
    col: schemaCol,
    pattern: suf.pat,
    case_insensitive: suf.ci,
  });
}

/** `id.in.(chunk)` OR zinciri PostgREST URL sınırına sığacak bir chunk boyutu var mı? */
function findKsAnyOrChunkSize(ids: number[]): number | null {
  let lo = 1;
  let hi = ids.length;
  let best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (ksAnyOrJoinedLength(ids, mid) <= KS_ANY_OR_MAX_LEN) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best > 0 ? best : null;
}

/** RPC `returns bigint[]` bazen JSON / string gelir; normalize et. */
function normalizeRpcIdArray(data: unknown): number[] {
  if (data == null) return [];
  if (Array.isArray(data)) {
    return data.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  }
  if (typeof data === "string") {
    try {
      const j = JSON.parse(data) as unknown;
      return Array.isArray(j) ? j.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function flattenRawValue(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

/**
 * PostgREST select: `cf_*_obktb_*` WHERE ile aynı generated ifadeler (satırda değer dönsün).
 * NOT: Her satır için PostgreSQL fonksiyon çağrısı yapar.
 * 100 satır × 125 col = 12.500 fonksiyon çağrısı → ~10sn ek gecikme.
 * Yalnızca `with_okbt=1` parametresiyle istenir (kullanıcı o sütunları gösterdiğinde).
 */
const OKBT_MULTI_COMPUTED_COLS: string[] = [
  ...Array.from({ length: 119 }, (_, i) => `m7_obktb_${i}`),
  ...(["t1i", "t2i", "kodms", "kodiy", "kodcs", "kodau"] as const).flatMap((src) =>
    Array.from({ length: 26 }, (_, i) => `${src}_obktb_${i}`),
  ),
];

const DB_COLS_BASE = [
  "id","tarih","saat","saat_arama","tarih_tr_gunlu",
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

const DB_COLS_OKBT_EXTRA = [
  ...OKBT_BASAMAK_LABELS.map((_, i) => `obktb_${i}`),
  ...OKBT_MULTI_COMPUTED_COLS,
];

/** Varsayılan: OKBT sütunları dahil (geriye dönük uyumluluk). `with_okbt=0` ile azaltılır. */
const DB_COLS = [...DB_COLS_BASE, ...DB_COLS_OKBT_EXTRA];

/** pick=stb: hafif satır — kayıtlı filtre + oynanmamış maç seçici listesi (raw_data yok). */
const PICK_STUB_COLS = [
  "id",
  "tarih",
  "saat",
  "saat_arama",
  "lig_adi",
  "lig_kodu",
  "t1",
  "t2",
  "kod_ms",
  "sonuc_ms",
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
  iy1:      { col: "iy1",           mode: "ilike" },
  iyx:      { col: "iyx",           mode: "ilike" },
  iy2:      { col: "iy2",           mode: "ilike" },
  a:        { col: "a",             mode: "ilike" },
  u:        { col: "u",             mode: "ilike" },
  kg_var:   { col: "kg_var",        mode: "ilike" },
  kg_yok:   { col: "kg_yok",        mode: "ilike" },
  suffix4:  { col: "mac_suffix4",   mode: "ilike" },
  suffix3:  { col: "msmkt_display", mode: "ilike" },
  mbs:      { col: "mkt_display",   mode: "ilike" },
  // tarih: cf_tarih ayrı işlenir (tarih_arama + * ? joker / virgül-VEYA)
  // gün: cf_gun ayrı — aşağıda gunCfValueForSubstringIlike (DB değeri "DD.MM.YYYY günadı")
  // saat: time tipi — ILIKE için sql/add-matches-saat-arama-column.sql (saat_arama)
  saat:     { col: "saat_arama",    mode: "ilike" },
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

/** UI gösterimi ile uyum: maç kodu 7 hane, diğer kodlar 5 hane (leading-zero pad). */
const CODE_PAD_WIDTH: Record<string, number> = {
  id: 7,
  kod_ms: 5,
  kod_iy: 5,
  kod_cs: 5,
  kod_au: 5,
};

/**
 * Pad'li wildcard (SQL `_` / `0` başı) depoda kısa metinle (örn. 6529) eşleşsin diye
 * baştaki `_` veya `0` adım adım kırpılmış ek desenler (kod_* _arama + raw_data KOD*).
 */
function expandOptionalLeadingPadPattern(pattern: string, width: number): string[] {
  if (pattern.includes("%")) return [];
  const out: string[] = [];
  let cur = pattern;
  for (let i = 0; i < width - 1; i++) {
    if (!cur) break;
    const ch = cur[0];
    if (ch !== "_" && ch !== "0") break;
    cur = cur.slice(1);
    if (!cur) break;
    out.push(cur);
  }
  return out;
}

/**
 * *_arama sütunları bazı kurulumlarda pad'siz olabilir (örn. 9714).
 * Kullanıcı 5-hane wildcard yazdığında (örn. ___14) baştaki pad hanesi opsiyonel olsun:
 * ___14 -> __14 -> _14 -> 14
 */
function expandOptionalLeadingPadWildcard(colId: string, pattern: string): string[] {
  const w = CODE_PAD_WIDTH[colId];
  if (!w) return [];
  return expandOptionalLeadingPadPattern(pattern, w);
}

/** "," → OR parçalarına böl. */
function splitOrParts(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

/** "+" → AND parçalarına böl. */
function splitAndParts(v: string): string[] {
  return v.split("+").map((s) => s.trim()).filter(Boolean);
}

/** Virgül-OR içinde tek başına `_` → hücre boş (null / boş metin). Skor sütunlarında ayrıca `-` ve en-dash. */
function isBlankCellOrToken(t: string): boolean {
  const s = t.trim();
  return s === "_" || s === "_ ";
}

function postgrestFieldEmptyOrExpr(field: string): string {
  // PostgREST: boş metin `eq.` (tırnaklı `eq.""` bazı katmanlarda yanlış parse olabiliyor)
  return `${field}.is.null,${field}.eq.`;
}

function postgrestSkorFieldEmptyOrExpr(field: string): string {
  return `${field}.is.null,${field}.eq.,${field}.eq."-",${field}.eq."–"`;
}

function postgrestMsOddsEmptyOrExpr(textField: string, numField: string): string {
  return `${textField}.is.null,${textField}.eq.,${numField}.is.null`;
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

/** Yalnızca `%` (UI'da yalnız `*`): Postgres `'' ILIKE '%'` true olduğundan boş metinleri süzmek için ana kolonda .not.is.null ile birleştirilir. */
function isOnlyPercentIlikePattern(pat: string): boolean {
  const s = pat.trim();
  return s.length > 0 && /^%+$/.test(s);
}

/** ILIKE içinde % ve _ sabit karakter olarak eşleşsin (düz girdi = tam metin). */
function escapeIlikeExactLiteral(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Üst çubuk / çift yönlü: düz metin tam eşleşme; * ? → ILIKE deseni. */
function plainOrWildcardIlikePattern(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return t.includes("*") || t.includes("?") ? cfPatternToIlikePattern(t) : escapeIlikeExactLiteral(t);
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
 * Joker yoksa sade değer → tam eşleşme (eq); metin sütunlarında üst katman ilike ile CI tam metin uygular.
 * defaultWrap: yalnızca * ? içeren desenlerde like vs ilike seçimi (prefix → like, contains → ilike).
 */
function parseFilterBranch(p: string, defaultWrap: "prefix" | "contains" = "prefix"): FilterBranch {
  const t = p.trim();
  // `_` / `_ ` boş hücre — `*`/`?` jokerinden önce (tek `_` jokerde SQL `_` olur)
  if (isBlankCellOrToken(t)) return { kind: "eq", val: t };
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
  // Sade değer — tam eşleşme (metin kolonları applyGenericFilter ile ilike kaçışlı uygulanır)
  return { kind: "eq", val: t };
}

/** PostgREST or() ifadesi için string. BETWEEN: and(gte,lte) iç grup kullanır. */
function branchToOrStr(field: string, b: FilterBranch, plainEqAsIlike = true): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  if (b.kind === "eq" && isBlankCellOrToken(b.val)) {
    return postgrestFieldEmptyOrExpr(field);
  }
  if (plainEqAsIlike && b.kind === "eq") {
    return `${field}.ilike.${q(escapeIlikeExactLiteral(b.val))}`;
  }
  switch (b.kind) {
    case "like": {
      const inner = `${field}.like.${q(b.pat)}`;
      return isOnlyPercentIlikePattern(b.pat)
        ? `and(${inner},${field}.not.is.null,${field}.neq.)`
        : inner;
    }
    case "ilike": {
      const inner = `${field}.ilike.${q(b.pat)}`;
      return isOnlyPercentIlikePattern(b.pat)
        ? `and(${inner},${field}.not.is.null,${field}.neq.)`
        : inner;
    }
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyParsedFilterBranch(
  query: any,
  field: string,
  b: FilterBranch,
  plainEqAsIlike: boolean
): any {
  if (b.kind === "eq" && isBlankCellOrToken(b.val)) {
    return query.or(postgrestFieldEmptyOrExpr(field));
  }
  if (b.kind === "like" || b.kind === "ilike") {
    if (isOnlyPercentIlikePattern(b.pat)) {
      const qx = b.kind === "ilike" ? query.ilike(field, b.pat) : query.like(field, b.pat);
      return qx.not(field, "is", null).neq(field, "");
    }
  }
  if (plainEqAsIlike && b.kind === "eq") {
    return query.ilike(field, escapeIlikeExactLiteral(b.val));
  }
  return applyBranchDirect(query, field, b);
}

/**
 * Genel filtre uygulayıcı: "," → OR, "+" → AND.
 * field: PostgREST sütun ifadesi (ör: "lig_adi", "raw_data->>KODAU45")
 * defaultWrap: * ? desenlerinde like / ilike seçimi
 * plainEqAsIlike: düz eq → kaçışlı ilike (metin tam eşleşme, büyük/küçük harf duyarsız); bigint vb. için false
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyGenericFilter(
  query: any,
  field: string,
  v: string,
  defaultWrap: "prefix" | "contains" = "prefix",
  plainEqAsIlike = true,
  /** raw_data KOD* / KODSK: depoda pad'siz metin; baştaki 0/_ jokerini kademeli kırp. */
  optionalLeadingPadWidth: number | null = null
): any {
  const t = v.trim();
  if (isBlankCellOrToken(t)) {
    return query.or(postgrestFieldEmptyOrExpr(field));
  }
  const orParts = splitOrParts(v);
  if (!orParts.length) return query;

  if (orParts.length === 1) {
    // Tek OR → AND zincirleri: tek atom doğrudan; çoklu atom PostgREST and(...) ile (boş `_` dahil)
    const andParts = splitAndParts(orParts[0]!);
    if (andParts.length === 1) {
      const ap = andParts[0]!;
      if (isBlankCellOrToken(ap)) {
        return query.or(postgrestFieldEmptyOrExpr(field));
      }
      const b = parseFilterBranch(ap, defaultWrap);
      if (
        optionalLeadingPadWidth != null &&
        (b.kind === "like" || b.kind === "ilike") &&
        !isOnlyPercentIlikePattern(b.pat)
      ) {
        const extras = expandOptionalLeadingPadPattern(b.pat, optionalLeadingPadWidth);
        if (extras.length) {
          const pats = [b.pat, ...extras];
          const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '""')}"`;
          const expr = pats.map((pat) => `${field}.${b.kind}.${q(pat)}`).join(",");
          return query.or(expr);
        }
      }
      return applyParsedFilterBranch(query, field, b, plainEqAsIlike);
    }
    const andExprs = andParts.map((ap) => {
      if (isBlankCellOrToken(ap)) return postgrestFieldEmptyOrExpr(field);
      return branchToOrStr(field, parseFilterBranch(ap, defaultWrap), plainEqAsIlike);
    });
    return andExprs.length ? query.or(`and(${andExprs.join(",")})`) : query;
  }

  // Birden fazla OR → or() ifadesi
  const segments: string[] = [];
  for (const orPart of orParts) {
    const andParts = splitAndParts(orPart);
    if (andParts.length === 1) {
      const ap0 = andParts[0]!;
      if (isBlankCellOrToken(ap0)) {
        segments.push(postgrestFieldEmptyOrExpr(field));
      } else {
        segments.push(branchToOrStr(field, parseFilterBranch(ap0, defaultWrap), plainEqAsIlike));
      }
    } else {
      // AND grubu or() içinde: and(cond1,cond2,...)
      const andExprs = andParts.map((ap) => {
        if (isBlankCellOrToken(ap)) return postgrestFieldEmptyOrExpr(field);
        return branchToOrStr(field, parseFilterBranch(ap, defaultWrap), plainEqAsIlike);
      });
      segments.push(`and(${andExprs.join(",")})`);
    }
  }
  return query.or(segments.join(","));
}

/**
 * cf_* tam sayı sütunları: sadece rakam → .eq; * ? joker → GENERATED *_arama üzerinde ilike.
 * *_arama değerleri şema ID sütunlarında 5 hane lpad olmalı (UI sabit genişlik); aksi halde
 * örn. *?497 → 0_497 deseni ham "2497" metninde eşleşmez. sql/alter-matches-integer-arama-lpad5.sql
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
    if (isBlankCellOrToken(p)) {
      return q.or(`${col}.is.null`);
    }
    const b = parseFilterBranch(p.trim(), "prefix");
    if (b.kind === "like" || b.kind === "ilike") {
      // Joker → _arama metin sütunu
      if (!arama) return q;
      const qx = q[b.kind](arama, b.pat);
      return isOnlyPercentIlikePattern(b.pat)
        ? qx.not(arama, "is", null).neq(arama, "")
        : qx;
    }
    if (b.kind === "between") {
      const lo = Number(b.lo), hi = Number(b.hi);
      return Number.isFinite(lo) && Number.isFinite(hi) ? q.gte(col, lo).lte(col, hi) : q;
    }
    if (b.kind === "eq" || b.kind === "neq" || b.kind === "gt" || b.kind === "gte" || b.kind === "lt" || b.kind === "lte") {
      const val = (b as { val: string }).val;
      const n = Number(val);
      if (Number.isFinite(n)) return q[b.kind](col, n);
      if (arama && b.kind === "eq") return q.ilike(arama, escapeIlikeExactLiteral(val));
      return q;
    }
    return q;
  };

  const branchStr = (p: string): string => {
    if (isBlankCellOrToken(p)) return `${col}.is.null`;
    const b = parseFilterBranch(p.trim(), "prefix");
    if (b.kind === "like" || b.kind === "ilike") {
      if (!arama) return "";
      const inner = `${arama}.${b.kind}."${b.pat.replace(/"/g, '""')}"`;
      return isOnlyPercentIlikePattern(b.pat)
        ? `and(${inner},${arama}.not.is.null,${arama}.neq.)`
        : inner;
    }
    if (b.kind === "between") return `and(${col}.gte.${b.lo},${col}.lte.${b.hi})`;
    if (b.kind === "eq" || b.kind === "neq" || b.kind === "gt" || b.kind === "gte" || b.kind === "lt" || b.kind === "lte") {
      const val = (b as { val: string }).val;
      const n = Number(val);
      if (Number.isFinite(n)) return `${col}.${b.kind}.${n}`;
      if (arama && b.kind === "eq") {
        const esc = escapeIlikeExactLiteral(val).replace(/"/g, '""');
        return `${arama}.ilike."${esc}"`;
      }
      return "";
    }
    return "";
  };

  if (orParts.length === 1) {
    const ands = splitAndParts(orParts[0]!);
    if (ands.length === 1) {
      return applyOne(query, ands[0]!);
    }
    const andExprs = ands
      .map((ap) => {
        if (isBlankCellOrToken(ap)) return `${col}.is.null`;
        return branchStr(ap);
      })
      .filter(Boolean);
    return andExprs.length ? query.or(`and(${andExprs.join(",")})`) : query;
  }

  const segments = orParts.map((orPart) => {
    const ands = splitAndParts(orPart);
    if (ands.length === 1) return branchStr(ands[0]!);
    const exprs = ands
      .map((ap) => {
        if (isBlankCellOrToken(ap)) return `${col}.is.null`;
        return branchStr(ap);
      })
      .filter(Boolean);
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
  const quoteVal = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '""')}"`;

  const applyOne = (q: any, p: string): any => {
    if (isBlankCellOrToken(p)) {
      return q.or(`${col}.is.null`);
    }
    const b = parseFilterBranch(p.trim(), "prefix");
    if (b.kind === "like" || b.kind === "ilike") {
      const pats = [b.pat, ...expandOptionalLeadingPadWildcard(colId, b.pat)];
      if (pats.length === 1) {
        const qx = q[b.kind](arama, b.pat);
        return isOnlyPercentIlikePattern(b.pat)
          ? qx.not(arama, "is", null).neq(arama, "")
          : qx;
      }
      const expr = pats.map((pat) => `${arama}.${b.kind}.${quoteVal(pat)}`).join(",");
      return query.or(expr);
    }
    if (b.kind === "between") {
      const lo = Number(b.lo), hi = Number(b.hi);
      return Number.isFinite(lo) && Number.isFinite(hi) ? q.gte(col, lo).lte(col, hi) : q;
    }
    if (b.kind === "eq" || b.kind === "neq" || b.kind === "gt" || b.kind === "gte" || b.kind === "lt" || b.kind === "lte") {
      const val = (b as { val: string }).val;
      const n = Number(val);
      if (Number.isFinite(n)) return q[b.kind](col, n);
      if (arama && b.kind === "eq") return q.ilike(arama, escapeIlikeExactLiteral(val));
      return q;
    }
    return q;
  };

  const branchStr = (p: string): string => {
    if (isBlankCellOrToken(p)) return `${col}.is.null`;
    const b = parseFilterBranch(p.trim(), "prefix");
    if (b.kind === "like" || b.kind === "ilike") {
      const pats = [b.pat, ...expandOptionalLeadingPadWildcard(colId, b.pat)];
      const segs = pats.map((pat) => `${arama}.${b.kind}.${quoteVal(pat)}`);
      const inner = segs.length > 1 ? `or(${segs.join(",")})` : segs[0]!;
      return isOnlyPercentIlikePattern(b.pat)
        ? `and(${inner},${arama}.not.is.null,${arama}.neq.)`
        : inner;
    }
    if (b.kind === "between") return `and(${col}.gte.${b.lo},${col}.lte.${b.hi})`;
    if (b.kind === "eq" || b.kind === "neq" || b.kind === "gt" || b.kind === "gte" || b.kind === "lt" || b.kind === "lte") {
      const val = (b as { val: string }).val;
      const n = Number(val);
      if (Number.isFinite(n)) return `${col}.${b.kind}.${n}`;
      if (arama && b.kind === "eq") {
        const esc = escapeIlikeExactLiteral(val).replace(/"/g, '""');
        return `${arama}.ilike."${esc}"`;
      }
      return "";
    }
    return "";
  };

  // Tüm parçalar saf tam sayı → .in()
  if (orParts.length > 1 && orParts.every((p) => /^\d+$/.test(p.trim()))) {
    return query.in(col, orParts.map((p) => Number(p.trim())));
  }

  if (orParts.length === 1) {
    const ands = splitAndParts(orParts[0]!);
    if (ands.length === 1) {
      return applyOne(query, ands[0]!);
    }
    const andExprs = ands
      .map((ap) => {
        if (isBlankCellOrToken(ap)) return `${col}.is.null`;
        return branchStr(ap);
      })
      .filter(Boolean);
    return andExprs.length ? query.or(`and(${andExprs.join(",")})`) : query;
  }

  const segments = orParts.map((orPart) => {
    const ands = splitAndParts(orPart);
    if (ands.length === 1) return branchStr(ands[0]!);
    const exprs = ands
      .map((ap) => {
        if (isBlankCellOrToken(ap)) return `${col}.is.null`;
        return branchStr(ap);
      })
      .filter(Boolean);
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

/** Tek OR / tek AND atomunda * ? jokeri → LIKE / ILIKE deseni (prefix modu). */
function getSimpleRawJsonWildcardPattern(
  v: string,
  defaultWrap: "prefix" | "contains" = "prefix"
): { pat: string; ci: boolean } | null {
  const orParts = splitOrParts(v);
  if (orParts.length !== 1) return null;
  const andParts = splitAndParts(orParts[0]!);
  if (andParts.length !== 1) return null;
  const b = parseFilterBranch(andParts[0]!.trim(), defaultWrap);
  if (b.kind !== "like" && b.kind !== "ilike") return null;
  return { pat: b.pat, ci: b.kind === "ilike" };
}

/**
 * Tek OR / tek AND atomunda UI `*23` → SQL `%23` gibi **LIKE deseni % ile başlayan** sonek jokeri.
 * Padlenmiş metin üzerinde eşleşme (ham KOD* ve şema kod kolonları) için RPC’ye uygun.
 */
function getSimplePaddedKodSuffixWildcard(v: string): { pat: string; ci: boolean } | null {
  const wild = getSimpleRawJsonWildcardPattern(v.trim(), "prefix");
  if (!wild || isOnlyPercentIlikePattern(wild.pat) || !wild.pat.startsWith("%")) return null;
  return { pat: wild.pat, ci: wild.ci };
}

/**
 * KOD* alanlarında baştaki `?` dizisi (örn. `???4`) tam-prefix LIKE üretip çok pahalı
 * olabiliyor. Kullanıcı beklentisi genelde "sonu 4 olanlar" olduğundan `*4`e yumuşat.
 */
function normalizeRawKodWildcardInput(jsonKey: string, raw: string): string {
  if (!isRawFiveDigitPaddedKodJsonKey(jsonKey)) return raw;
  const t = raw.trim();
  if (!t) return raw;
  const orParts = splitOrParts(t);
  if (orParts.length !== 1) return raw;
  const andParts = splitAndParts(orParts[0]!);
  if (andParts.length !== 1) return raw;
  const atom = andParts[0]!.trim();
  if (!atom.includes("?") || atom.includes("*")) return raw;
  const m = atom.match(/^\?+(.*)$/);
  if (!m) return raw;
  const rest = (m[1] ?? "").trim();
  if (!rest) return raw;
  return `*${rest}`;
}

function stripLeadingZerosKeepOne(s: string): string {
  return s.replace(/^0+(?=\d)/, "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST zinciri
function tryApplyRawKodNumericExactFallback(
  query: any,
  jsonKey: string,
  normalized: string
): any | null {
  if (!isRawFiveDigitPaddedKodJsonKey(jsonKey)) return null;
  const t = normalized.trim();
  if (!/^\d+$/.test(t)) return null;
  const field = `raw_data->>${jsonKey}`;
  const a = t;
  const b = stripLeadingZerosKeepOne(t);
  const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '""')}"`;
  if (a === b) return query.eq(field, a);
  return query.or(`${field}.eq.${q(a)},${field}.eq.${q(b)}`);
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
 * `get_raw_data_keys` yalnızca son birkaç satırdan anahtar topladığı için `KODIYMS` vb.
 * birleşik haritada yoksa `raw_KODIYMS` → `KODIYMS` güvenli çıkarımı (cf_* yine uygulanır).
 */
function resolveRawCfJsonKey(colId: string, mergedRawCf: Record<string, string>): string | null {
  const mapped = mergedRawCf[colId];
  if (mapped && SAFE_RAW_JSON_KEY.test(mapped)) return mapped;
  if (colId.startsWith("raw_")) {
    const inferred = colId.slice(4);
    if (SAFE_RAW_JSON_KEY.test(inferred)) return inferred;
  }
  return null;
}

/**
 * LIKE deseni `0%`, `00%`, … (yaln başta sıfır + %) → 5 haneye padlenince o sıfırlarla başlayan
 * kısa saf rakam hücreleri (örn. 2072). RPC kurulmadan PostgREST `match` (~) ile tamamlanır.
 */
function rawKodLeadingZeroPercentToShortDigitRegex(pat: string, padLen: number): string | null {
  if (pat.startsWith("%") || !pat.endsWith("%") || pat.length < 2) return null;
  const zeros = pat.slice(0, -1);
  if (!/^0+$/.test(zeros)) return null;
  const m = zeros.length;
  if (m >= padLen) return null;
  const maxLen = padLen - m;
  if (maxLen < 1) return null;
  return `^[0-9]{1,${maxLen}}$`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST zinciri
function tryApplyRawKodPaddedLeadingZeroPostgrestOr(
  query: any,
  jsonKey: string,
  v: string
): any | null {
  if (!SAFE_RAW_JSON_KEY.test(jsonKey)) return null;
  const padLen = rawKodJsonWildcardPadLen(jsonKey);
  if (padLen == null) return null;
  const wild = getSimpleRawJsonWildcardPattern(v.trim(), "prefix");
  if (!wild || isOnlyPercentIlikePattern(wild.pat)) return null;
  const reShort = rawKodLeadingZeroPercentToShortDigitRegex(wild.pat, padLen);
  if (!reShort) return null;
  const field = `raw_data->>${jsonKey}`;
  const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '""')}"`;
  const patEsc = q(wild.pat);
  const reEsc = q(reShort);
  if (wild.ci) {
    return query.or(`${field}.ilike.${patEsc},${field}.imatch.${reEsc}`);
  }
  return query.or(`${field}.like.${patEsc},${field}.match.${reEsc}`);
}

/**
 * Ham veri (raw_data) alan filtresi — normalize sonrası çekirdek (sync).
 * `*23` → `%23` sonek jokeri: padlenmiş eşleşme için `applyRawJsonPathIlikeFilterAsync` kullanılır.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST zinciri
function applyRawJsonPathIlikeFilterNormalized(
  query: any,
  jsonKey: string,
  normalized: string
): any {
  if (!SAFE_RAW_JSON_KEY.test(jsonKey)) return query;
  if (normalized.trim() === "*") {
    const field = `raw_data->>${jsonKey}`;
    // "*" için kullanıcı beklentisi: boş olmayan hücreler (null ve "" hariç).
    // PostgREST expression alanlarında not(...).neq(...) zinciri beklenmedik daralma
    // yapabildiği için tek OR ifadesinde and(...) olarak veriyoruz.
    return query.or(`and(${field}.not.is.null,${field}.neq.)`);
  }
  const kodPadOr = tryApplyRawKodPaddedLeadingZeroPostgrestOr(query, jsonKey, normalized);
  if (kodPadOr != null) return kodPadOr;
  const kodExactOr = tryApplyRawKodNumericExactFallback(query, jsonKey, normalized);
  if (kodExactOr != null) return kodExactOr;
  const padW = rawKodJsonWildcardPadLen(jsonKey);
  return applyGenericFilter(query, `raw_data->>${jsonKey}`, normalized, "prefix", true, padW);
}

/**
 * Ham veri (raw_data) alan filtresi — OR/AND/karşılaştırma/aralık/joker destekli.
 * Sade değer → tam eşleşme; * ? ile desen araması (sync yol; pad sonek için Async tercih edilir).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST zinciri
function applyRawJsonPathIlikeFilter(query: any, jsonKey: string, v: string): any {
  if (!SAFE_RAW_JSON_KEY.test(jsonKey)) return query;
  const normalized = normalizeRawKodWildcardInput(jsonKey, v);
  return applyRawJsonPathIlikeFilterNormalized(query, jsonKey, normalized);
}

/** `*5` / `*23` → padlenmiş ham KOD* metninde LIKE (RPC); yoksa sync çekirdek. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST zinciri
async function applyRawJsonPathIlikeFilterAsync(
  query: any,
  supabase: MatchesServiceClient,
  jsonKey: string,
  v: string
): Promise<any> {
  if (!SAFE_RAW_JSON_KEY.test(jsonKey)) return boxPostgrestChain(query);
  const normalized = normalizeRawKodWildcardInput(jsonKey, v);
  const suf = getSimplePaddedKodSuffixWildcard(normalized);
  if (suf && isRawFiveDigitPaddedKodJsonKey(jsonKey)) {
    const qRpc = await rpcPaddedKodPatternToQuery(query, supabase, "get_matches_raw_kod_padded_pattern_ids", {
      json_key: jsonKey,
      pattern: suf.pat,
      case_insensitive: suf.ci,
    });
    if (qRpc != null) return qRpc;
  }
  return boxPostgrestChain(applyRawJsonPathIlikeFilterNormalized(query, jsonKey, normalized));
}

/**
 * Metin sütun filtresi — OR/AND/karşılaştırma/aralık/joker destekli.
 * Sade değer → tam eşleşme (büyük/küçük harf duyarsız); * ? ile desen.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST zinciri
function applyCfTextColumnIlikeFilter(query: any, col: string, v: string): any {
  return applyGenericFilter(query, col, v, "contains");
}

/**
 * cf_gun: `tarih_tr_gunlu` genelde "24.04.2026 cuma" — düz "Cuma" tam eşleşmez;
 * `P*` da sütun tarihle başladığı için `P%` öneki eşleşmez. Her atomu *...* sar → ILIKE %…%.
 */
function gunCfValueForSubstringIlike(raw: string): string {
  const v = raw.trim();
  if (!v) return v;
  return splitOrParts(v)
    .map((orPart) =>
      splitAndParts(orPart)
        .map((ap) => {
          const s = ap.trim();
          if (!s) return s;
          if (isBlankCellOrToken(s)) return s;
          if (s.startsWith("*") && s.endsWith("*") && s.length >= 2) return s;
          return `*${s}*`;
        })
        .join("+"),
    )
    .join(",");
}

/** PostgREST `imatch` (~*) deseninde özel anlamlı karakterleri kaçır. */
function escapePostgresRegexForImatch(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * `tarih_tr_gunlu` ≈ "26.04.2026 pazartesi" — kullanıcı `*r` = gün adı **r ile başlasın** ister;
 * eski davranış `*r` → `%r%` tüm metinde "pazartesi" içindeki `r` yüzünden yanlış pozitifti.
 * - `*perş`, `*pazar` → tarih + boşluktan sonra önek eşleşmesi (PostgREST `imatch`)
 * - `paz*`, `cum*` → aynı (sondaki `*` glob önek)
 * İçinde `*`,`?` karmaşası veya `_` boş → eski ILIKE `gunCfValueForSubstringIlike` yolu.
 */
function parseGunWeekdayPrefixImatchPattern(atom: string): string | null {
  const t = atom.trim();
  if (!t || isBlankCellOrToken(t)) return null;
  const lead = /^\*+([^*?+,]+)$/.exec(t);
  if (lead) {
    const p = lead[1]!.trim();
    if (!p) return null;
    return `^[0-9]{1,2}\\.[0-9]{1,2}\\.[0-9]{4}\\s+${escapePostgresRegexForImatch(p)}`;
  }
  const trail = /^([^*?+,]+)\*+$/.exec(t);
  if (trail) {
    const p = trail[1]!.trim();
    if (!p) return null;
    return `^[0-9]{1,2}\\.[0-9]{1,2}\\.[0-9]{4}\\s+${escapePostgresRegexForImatch(p)}`;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCfGunColumnFilter(query: any, raw: string): any {
  const field = "tarih_tr_gunlu";
  const v = raw.trim();
  if (!v) return query;
  if (isBlankCellOrToken(v)) {
    return query.or(postgrestFieldEmptyOrExpr(field));
  }
  const orParts = splitOrParts(v);
  if (!orParts.length) return query;

  const allSimplePrefix = orParts.every((orPart) => {
    const ands = splitAndParts(orPart);
    if (!ands.length) return false;
    return ands.every((ap) => {
      const t = ap.trim();
      if (!t) return false;
      if (isBlankCellOrToken(t)) return false;
      return parseGunWeekdayPrefixImatchPattern(t) !== null;
    });
  });

  if (!allSimplePrefix) {
    return applyCfTextColumnIlikeFilter(query, field, gunCfValueForSubstringIlike(v));
  }

  const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '""')}"`;

  const segments: string[] = [];
  for (const orPart of orParts) {
    const ands = splitAndParts(orPart);
    if (ands.length === 1) {
      const ap = ands[0]!.trim();
      const re = parseGunWeekdayPrefixImatchPattern(ap);
      if (re) segments.push(`${field}.imatch.${q(re)}`);
    } else {
      const inner = ands
        .map((ap) => {
          const t = ap.trim();
          const re = parseGunWeekdayPrefixImatchPattern(t);
          return re ? `${field}.imatch.${q(re)}` : "";
        })
        .filter(Boolean);
      if (inner.length) segments.push(inner.length > 1 ? `and(${inner.join(",")})` : inner[0]!);
    }
  }
  const segf = segments.filter(Boolean);
  return segf.length ? query.or(segf.join(",")) : query;
}

/**
 * Saat sütunu: düz `HH:MM` (joker/OR/AND yok) → `saat_arama.eq` (btree indeks, hızlı COUNT).
 * Aksi halde eski ILIKE yolu (joker, virgül-VEYA, +-VE).
 */
function normalizeCfSaatHhMmToken(t: string): string | null {
  const s = t.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isInteger(h) || h < 0 || h > 23 || !Number.isInteger(mi) || mi < 0 || mi > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCfSaatColumnFilter(query: any, raw: string): any {
  const v = raw.trim();
  if (!v) return query;
  if (v.includes("*") || v.includes("?") || v.includes(",") || v.includes("+")) {
    return applyCfTextColumnIlikeFilter(query, "saat_arama", v);
  }
  const norm = normalizeCfSaatHhMmToken(v);
  if (norm) return query.eq("saat_arama", norm);
  return applyCfTextColumnIlikeFilter(query, "saat_arama", v);
}

/** Maç sonucu oranları: metin ms*; sayısal cf_* → GENERATED ms*_n (sql/add-matches-ms-odds-numeric-generated-cols.sql). */
const MS_ODDS_NUMERIC_COL: Record<"ms1" | "msx" | "ms2", string> = {
  ms1: "ms1_n",
  msx: "msx_n",
  ms2: "ms2_n",
};

function msOddsNumericField(col: "ms1" | "msx" | "ms2"): string {
  return MS_ODDS_NUMERIC_COL[col];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyMsOddsNumericComparison(q: any, numField: string, b: FilterBranch): any {
  if (b.kind === "between") {
    const lo = Number(String(b.lo).replace(",", "."));
    const hi = Number(String(b.hi).replace(",", "."));
    return Number.isFinite(lo) && Number.isFinite(hi) ? q.gte(numField, lo).lte(numField, hi) : q;
  }
  if (b.kind === "gt" || b.kind === "gte" || b.kind === "lt" || b.kind === "lte") {
    const n = Number(String(b.val).replace(",", "."));
    if (!Number.isFinite(n)) return q;
    if (b.kind === "gt") return q.gt(numField, n);
    if (b.kind === "gte") return q.gte(numField, n);
    if (b.kind === "lt") return q.lt(numField, n);
    return q.lte(numField, n);
  }
  if (b.kind === "eq" || b.kind === "neq") {
    const n = Number(String(b.val).replace(",", "."));
    if (!Number.isFinite(n)) return q;
    return b.kind === "eq" ? q.eq(numField, n) : q.neq(numField, n);
  }
  return q;
}

function branchToOrStrMsOdds(numField: string, textField: string, b: FilterBranch): string {
  const qstr = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  if (b.kind === "eq" && isBlankCellOrToken(b.val)) {
    return postgrestMsOddsEmptyOrExpr(textField, numField);
  }
  if (b.kind === "like" || b.kind === "ilike") {
    const inner = `${textField}.${b.kind}.${qstr(b.pat)}`;
    return isOnlyPercentIlikePattern(b.pat)
      ? `and(${inner},${textField}.not.is.null,${textField}.neq.)`
      : inner;
  }
  if (b.kind === "between") {
    const lo = Number(String(b.lo).replace(",", "."));
    const hi = Number(String(b.hi).replace(",", "."));
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return "";
    return `and(${numField}.gte.${lo},${numField}.lte.${hi})`;
  }
  if (b.kind === "gt" || b.kind === "gte" || b.kind === "lt" || b.kind === "lte" || b.kind === "eq" || b.kind === "neq") {
    const n = Number(String(b.val).replace(",", "."));
    if (!Number.isFinite(n)) return "";
    return `${numField}.${b.kind}.${n}`;
  }
  return "";
}

/**
 * ms1/msx/ms2 filtresinde tek virgül bazen ondalık ayıracı olarak gelir (örn. 1,75*).
 * Genel parser'da virgül OR anlamına geldiği için, bu özel durumda tek parça kabul ederiz.
 */
function splitMsOddsOrParts(raw: string): string[] {
  const v = raw.trim();
  if (!v) return [];
  const orParts = splitOrParts(v);
  if (orParts.length !== 2 || v.includes("+")) return orParts;
  if (!(v.includes("*") || v.includes("?"))) return orParts;
  const [left, right] = orParts;
  if (!left || !right) return orParts;
  if (!/\d/.test(left) || !/\d/.test(right)) return orParts;
  return [`${left}.${right}`];
}

/** ms1 / msx / ms2 sütun cf_* — joker metin + sayısal karşılaştırma (ms*_n). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyMsOddsCfFilter(query: any, col: "ms1" | "msx" | "ms2", v: string): any {
  const textField = col;
  const numField = msOddsNumericField(col);
  const orParts = splitMsOddsOrParts(v);
  if (!orParts.length) return query;

  const applyOne = (q: any, p: string): any => {
    if (isBlankCellOrToken(p)) {
      return q.or(postgrestMsOddsEmptyOrExpr(textField, numField));
    }
    const b = parseFilterBranch(p.trim(), "contains");
    if (b.kind === "like" || b.kind === "ilike") {
      return applyParsedFilterBranch(q, textField, b, true);
    }
    if (
      b.kind === "between" ||
      b.kind === "gt" ||
      b.kind === "gte" ||
      b.kind === "lt" ||
      b.kind === "lte" ||
      b.kind === "eq" ||
      b.kind === "neq"
    ) {
      if (b.kind === "eq" || b.kind === "neq") {
        const n = Number(String(b.val).replace(",", "."));
        if (!Number.isFinite(n)) return applyParsedFilterBranch(q, textField, b, true);
      }
      return applyMsOddsNumericComparison(q, numField, b);
    }
    return q;
  };

  if (orParts.length === 1) {
    const ands = splitAndParts(orParts[0]!);
    if (ands.length === 1) {
      return applyOne(query, ands[0]!);
    }
    const andExprs = ands
      .map((ap) => {
        if (isBlankCellOrToken(ap)) return postgrestMsOddsEmptyOrExpr(textField, numField);
        return branchToOrStrMsOdds(numField, textField, parseFilterBranch(ap, "contains"));
      })
      .filter(Boolean);
    return andExprs.length ? query.or(`and(${andExprs.join(",")})`) : query;
  }

  const segments = orParts.map((orPart) => {
    const ands = splitAndParts(orPart);
    if (ands.length === 1) {
      const ap0 = ands[0]!;
      if (isBlankCellOrToken(ap0)) return postgrestMsOddsEmptyOrExpr(textField, numField);
      return branchToOrStrMsOdds(numField, textField, parseFilterBranch(ap0, "contains"));
    }
    const exprs = ands
      .map((ap) => {
        if (isBlankCellOrToken(ap)) return postgrestMsOddsEmptyOrExpr(textField, numField);
        return branchToOrStrMsOdds(numField, textField, parseFilterBranch(ap, "contains"));
      })
      .filter(Boolean);
    return exprs.length > 1 ? `and(${exprs.join(",")})` : exprs[0] ?? "";
  }).filter(Boolean);

  return segments.length ? query.or(segments.join(",")) : query;
}


/** Düz skor "0-0" … "12-3" — joker yok; içerir araması 14-2, 4-20 gibi yanlış pozitif üretir. */
const PLAIN_SKOR_TOKEN_RE = /^\d+-\d+$/;

function isPlainSkorToken(t: string): boolean {
  const s = t.trim();
  if (!s) return false;
  if (s.includes("*") || s.includes("?")) return false;
  return PLAIN_SKOR_TOKEN_RE.test(s);
}

/**
 * İY / MS sütun filtresi:
 * - düz "4-2" → tam eşleşme
 * - virgül-OR: "2-1,_" → "2-1" veya boş
 * - sonuna "_" / boşluk / "._" gibi sonekler gelirse boş hücreleri de dahil et
 *   (null, "", "-", "–")
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCfSkorColumnFilter(query: any, col: "sonuc_iy" | "sonuc_ms", raw: string): any {
  const v = String(raw ?? "").trim();
  const emptyExpr = postgrestSkorFieldEmptyOrExpr(col);
  if (!v) return query;
  if (isBlankCellOrToken(v)) {
    return query.or(emptyExpr);
  }
  const orParts = splitOrParts(v);
  if (!orParts.length) return query;

  const segments: string[] = [];
  let wantsBlankAny = false;
  for (const orPart of orParts) {
    const andParts = splitAndParts(orPart);
    if (andParts.length !== 1) {
      return applyCfTextColumnIlikeFilter(query, col, v);
    }
    const tokenRaw = andParts[0]!.trim();
    if (tokenRaw === "_" || tokenRaw === " _" || tokenRaw === "_ ") {
      wantsBlankAny = true;
      continue;
    }
    const { core, includeBlank } = parsePlainSkorTokenWithBlankSuffix(tokenRaw);
    if (includeBlank) wantsBlankAny = true;

    if (!core && includeBlank) {
      wantsBlankAny = true;
      continue;
    }
    if (!isPlainSkorToken(core)) {
      return applyCfTextColumnIlikeFilter(query, col, v);
    }
    const q = core.replace(/"/g, '""');
    segments.push(`${col}.eq."${q}"`);
  }
  if (segments.length === 1 && !wantsBlankAny) {
    return query.eq(col, parsePlainSkorTokenWithBlankSuffix(splitAndParts(orParts[0]!)[0]!.trim()).core);
  }
  const expr = wantsBlankAny ? (segments.length ? `${segments.join(",")},${emptyExpr}` : emptyExpr) : segments.join(",");
  return query.or(expr);
}

/** Üst bar kod kutusu: tüm DB’de son N hane (matches_with_suffix_cols görünümü gerekir). */
const KS_REF_OK = new Set(["id", "kod_ms", "kod_iy", "kod_cs", "kod_au"]);
/** KOD son N hane (◉ panel + ks_any_*); SQL `POWER(10, p_n)` ile uyumlu üst sınır. */
const KS_N_OK = new Set([3, 4, 5]);

// ── OKBT sunucu-tarafı filtresi (basit sayısal ifadeler) ─────────────────────
// Kaynak → max idx (5-haneli: 0..14, Maç ID 7-haneli: 0..19)
const OKBT_SRC_MAX_IDX: Record<string, number> = {
  macid: 19,
  t1i: 14,
  t2i: 14,
  kodms: 14,
  kodiy: 14,
  kodcs: 14,
  kodau: 14,
};

function parseObktbSrcIdx(colId: string): { src: string; idx: number } | null {
  const m = /^([a-z][a-z0-9]*)_obktb_(\d{1,2})$/.exec(colId);
  if (!m) return null;
  const src = m[1]!;
  const idx = Number(m[2]);
  const maxIdx = OKBT_SRC_MAX_IDX[src];
  if (maxIdx === undefined) return null;
  if (!Number.isInteger(idx) || idx < 0 || idx > maxIdx) return null;
  return { src, idx };
}

/** OKBT generated fn (cf_*_obktb_*) sunucu süzümü: `,` OR, `+` AND, `_` boş (null). `* ?` → null (ayrı joker yolu). */
type OkbtSeg = { kind: "blank" } | { kind: "neq"; n: number } | { kind: "range"; min: number | null; max: number | null };

function parseObktbSingleAtom(t: string): OkbtSeg | null {
  const s = t.trim();
  if (!s) return null;
  const rm = s.match(/^(-?\d+)\s*(?:\.\.|<->)\s*(-?\d+)$/);
  if (rm) {
    const lo = Number(rm[1]);
    const hi = Number(rm[2]);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    return { kind: "range", min: Math.min(lo, hi), max: Math.max(lo, hi) };
  }
  if (s.startsWith(">=")) {
    const n = Number(s.slice(2).trim());
    if (!Number.isFinite(n)) return null;
    return { kind: "range", min: n, max: null };
  }
  if (s.startsWith("<=")) {
    const n = Number(s.slice(2).trim());
    if (!Number.isFinite(n)) return null;
    return { kind: "range", min: null, max: n };
  }
  if (s.startsWith("<>")) {
    const n = Number(s.slice(2).trim());
    if (!Number.isFinite(n)) return null;
    return { kind: "neq", n };
  }
  if (s.startsWith(">")) {
    const n = Number(s.slice(1).trim());
    if (!Number.isFinite(n)) return null;
    return { kind: "range", min: n + 1, max: null };
  }
  if (s.startsWith("<")) {
    const n = Number(s.slice(1).trim());
    if (!Number.isFinite(n)) return null;
    return { kind: "range", min: null, max: n - 1 };
  }
  if (/^-?\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return { kind: "range", min: n, max: n };
  }
  return null;
}

function parseObktbServerOrGroups(raw: string): OkbtSeg[][] | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.includes("*") || v.includes("?")) return null;
  const groups: OkbtSeg[][] = [];
  for (const orPart of splitOrParts(v)) {
    const andSegs: OkbtSeg[] = [];
    for (const ap of splitAndParts(orPart)) {
      const s = ap.trim();
      if (!s) return null;
      if (isBlankCellOrToken(s)) {
        andSegs.push({ kind: "blank" });
        continue;
      }
      const seg = parseObktbSingleAtom(s);
      if (!seg) return null;
      andSegs.push(seg);
    }
    if (!andSegs.length) return null;
    groups.push(andSegs);
  }
  return groups.length ? groups : null;
}

function okbtSegToPostgrestStr(fnName: string, seg: OkbtSeg): string {
  if (seg.kind === "blank") return `${fnName}.is.null`;
  if (seg.kind === "neq") return `${fnName}.neq.${seg.n}`;
  const { min, max } = seg;
  if (min !== null && max !== null && min === max) return `${fnName}.eq.${min}`;
  if (min !== null && max !== null) return `and(${fnName}.gte.${min},${fnName}.lte.${max})`;
  if (min !== null) return `${fnName}.gte.${min}`;
  if (max !== null) return `${fnName}.lte.${max}`;
  return "";
}

const OKBT_MIX_INT_MAX = 99;

function intersectOkbtIntSets(a: Set<number>, b: Set<number>): Set<number> {
  const out = new Set<number>();
  for (const x of a) {
    if (b.has(x)) out.add(x);
  }
  return out;
}

/** 0..maxInclusive içinde tek OKBT atomunun tam tamsayı kümesi (sunucu joker genişletmesi ile uyumlu). */
function okbtSegToIntSet(seg: OkbtSeg, maxInclusive: number): Set<number> | null {
  if (seg.kind === "blank") return null;
  if (seg.kind === "neq") {
    const s = new Set<number>();
    for (let n = 0; n <= maxInclusive; n++) {
      if (n !== seg.n) s.add(n);
    }
    return s;
  }
  const { min, max } = seg;
  const lo = min == null ? 0 : Math.max(0, min);
  const hi = max == null ? maxInclusive : Math.min(maxInclusive, max);
  if (lo > hi) return new Set();
  const s = new Set<number>();
  for (let n = lo; n <= hi; n++) s.add(n);
  return s;
}

type OkbtExpandResolved = Exclude<OkbtWildcardExpand, null>;

function okbtWildcardExpandToIntSet(w: OkbtExpandResolved, maxInclusive: number): Set<number> {
  if (w.kind === "all") {
    const s = new Set<number>();
    for (let n = 0; n <= maxInclusive; n++) s.add(n);
    return s;
  }
  if (w.kind === "none") return new Set();
  return new Set(w.ints);
}

/**
 * `,` OR ve `+` AND içinde joker (*?) ile düz sayı/ aralık atomlarını birleştirir (örn. `1*,25`, `>5+1*`).
 * `parseObktbServerOrGroups` ifadede * veya ? görünce null; `expandOkbtWildcardFilter` virgülde null
 * kaldığı için bu iki durumda filtre hiç uygulanmıyordu.
 */
function tryExpandOkbtMixedWildOr(obktV: string): OkbtWildcardExpand | null {
  const t = normalizeOkbtCfInput(obktV);
  if (!t) return null;
  const MAX = OKBT_MIX_INT_MAX;
  const orParts = splitOrParts(t);
  if (!orParts.length) return null;

  const union = new Set<number>();
  for (const orPart of orParts) {
    const andParts = splitAndParts(orPart);
    if (!andParts.length) return null;
    let andSet: Set<number> | null = null;
    for (const apRaw of andParts) {
      const ap = apRaw.trim();
      if (!ap) return null;
      if (isBlankCellOrToken(ap)) return null;
      let segSet: Set<number> | null;
      if (ap.includes("*") || ap.includes("?")) {
        const w = expandOkbtWildcardFilter(ap);
        if (!w) return null;
        segSet = okbtWildcardExpandToIntSet(w, MAX);
      } else {
        const atom = parseObktbSingleAtom(ap);
        if (!atom) return null;
        segSet = okbtSegToIntSet(atom, MAX);
      }
      if (segSet === null) return null;
      andSet = andSet === null ? segSet : intersectOkbtIntSets(andSet, segSet);
      if (andSet.size === 0) break;
    }
    if (andSet == null) return null;
    for (const n of andSet) union.add(n);
  }

  if (union.size === 0) return { kind: "none" };
  if (union.size === MAX + 1) return { kind: "all" };
  return { kind: "ints", ints: Array.from(union).sort((a, b) => a - b) };
}

/**
 * Tarama modu “maç ara” kutusu: mevcut tüm API filtreleri uygulandıktan sonra,
 * **tüm eşleşen küme** içinde serbest metin arar (sayfalama öncesi WHERE’e eklenir).
 *
 * Her boşlukla ayrılmış kelime için: (birçok metin kolonundan herhangi biri ILIKE %kelime%)
 * — kelimeler arası AND (hepsi bir yerde geçmeli).
 *
 * Kolonlar (kasıtlı dar küme — 17+ ILIKE OR her token’da tam tarama + timeout riski):
 * takım/lig/personel/gün + kod/id/tarih arama kolonları. Skor ve saat metni çıkarıldı (takım adı araması için gereksiz).
 * Hız için: sql/add-matches-tarama-trgm-indexes.sql + mümkünse üstte tarih/lig ile küme daraltın.
 *
 * Kelimeler: boşlukla AND. "Barcelona - Real Madrid" gibi girişlerde tire / vs ayırıcıları boşluğa çevrilir;
 * tek başına "-" kelime olarak aranmaz (yoksa hiç sonuç çıkmazdı).
 *
 * Birden çok kelime: PostgREST’te her kelime için (tüm metin kolonlarında OR) şartları
 * birbirine AND ile bağlamak gerekir. Ardışık `.or()` çağrıları yalnızca `or` parametresini
 * art arda ekler; beklenen (kelime1 OR …) AND (kelime2 OR …) yerine yanlış/tek parça
 * oluşabildiği için tek `and=(or(...),or(...))` kullanılır.
 */
function normalizeTaramaQTokens(raw: string): string[] {
  const q = raw.trim().slice(0, 200);
  if (!q) return [];
  const spaced = q
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, " ")
    .replace(/\bvs\.?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = spaced.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const t = p.replace(/"/g, "").replace(/%/g, "").trim();
    if (t.length < 2) continue;
    if (/^[-&:|/\\]+$/.test(t)) continue;
    out.push(t.slice(0, 80));
  }
  return out.slice(0, 12);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyTaramaQuickSearchFilter(query: any, rawQ: string): any {
  const tokens = normalizeTaramaQTokens(rawQ);
  if (!tokens.length) return query;

  const directTextCols = [
    "t1",
    "t2",
    "lig_adi",
    "lig_kodu",
    "alt_lig_adi",
    "hakem",
    "tarih_tr_gunlu",
    "sezon_adi",
  ] as const;

  const aramaCols = [
    "id_arama",
    "kod_ms_arama",
    "kod_iy_arama",
    "kod_cs_arama",
    "kod_au_arama",
    "t1i_arama",
    "t2i_arama",
    "tarih_arama",
  ] as const;

  /** Her kelime için: (t1|t2|lig|… ilike) parça listesi — PostgREST `or=(a,b,c)` biçimi. */
  const partLists: string[][] = [];
  for (const tok of tokens) {
    const t = tok.replace(/"/g, "").replace(/%/g, "").slice(0, 80);
    if (!t) continue;
    // PostgREST: * = % (URL’de % kaçışı riskini azaltır)
    const patStar = `*${t.replace(/\*/g, "")}*`;
    const parts: string[] = [];
    for (const c of directTextCols) {
      parts.push(`${c}.ilike.${patStar}`);
    }
    for (const c of aramaCols) {
      parts.push(`${c}.ilike.${patStar}`);
    }
    partLists.push(parts);
  }
  if (!partLists.length) return query;

  const u = (query as { url?: URL }).url;
  if (!u?.searchParams) return query;

  if (partLists.length === 1) {
    u.searchParams.append("or", `(${partLists[0]!.join(",")})`);
    return query;
  }

  // and=("or(a,b,c)","or(d,e,f)") — dış and virgülü; iç or(...) virgülleri tırnak içinde kalır
  const quotedOrGroups = partLists.map((parts) => {
    const inner = `or(${parts.join(",")})`;
    return `"${inner.replace(/\\/g, "\\\\").replace(/"/g, '""')}"`;
  });
  u.searchParams.append("and", `(${quotedOrGroups.join(",")})`);
  return query;
}

/**
 * KOD sonek RPC taramasını daraltmak için üst bar / widget tarih sınırları (ISO yyyy-mm-dd).
 * Tarih yoksa null → RPC tüm tabloyu tarar (büyük tabloda zaman aşımı riski).
 */
function ksAnyRpcTarihBounds(sp: URLSearchParams): { p_tarih_from: string | null; p_tarih_to: string | null } {
  const pad = (raw: string, max: number): string => {
    const n = Number(raw.trim());
    if (!Number.isFinite(n) || n < 1 || n > max) return "";
    return String(n).padStart(2, "0");
  };
  const tgRaw = sp.get("tarih_gun")?.trim() ?? "";
  const taRaw = sp.get("tarih_ay")?.trim() ?? "";
  const tyRaw = sp.get("tarih_yil")?.trim() ?? "";
  if (tgRaw && taRaw && /^\d{4}$/.test(tyRaw)) {
    const g = pad(tgRaw, 31);
    const a = pad(taRaw, 12);
    const y = tyRaw;
    if (g && a && y) {
      const di = Number(g);
      const mi = Number(a);
      const yi = Number(y);
      const last = new Date(yi, mi, 0).getDate();
      const day = Math.min(di, last);
      const iso = `${y}-${String(mi).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { p_tarih_from: iso, p_tarih_to: iso };
    }
  }

  const tarihFrom = sp.get("tarih_from")?.trim() || "";
  const tarihTo = sp.get("tarih_to")?.trim() || "";
  if (tarihFrom && tarihTo) return { p_tarih_from: tarihFrom, p_tarih_to: tarihTo };
  if (tarihFrom) return { p_tarih_from: tarihFrom, p_tarih_to: tarihFrom };
  if (tarihTo) return { p_tarih_from: null, p_tarih_to: tarihTo };
  return { p_tarih_from: null, p_tarih_to: null };
}

export async function GET(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json(
      { error: "Supabase ortam değişkenleri eksik (.env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const pickStub = sp.get("pick") === "stb";
  const oynanmamisOnly = sp.get("oynanmamis") === "1";
  const page = Math.max(1, Number(sp.get("page") || 1));
  const maxLimit = pickStub ? 500 : 100;
  const limit = Math.min(maxLimit, Math.max(1, Number(sp.get("limit") || 100)));
  const offset = (page - 1) * limit;
  if (offset > MAX_RANGE_OFFSET) {
    const maxPage = Math.floor(MAX_RANGE_OFFSET / limit) + 1;
    return NextResponse.json(
      {
        error:
          `Sayfa çok derin (OFFSET=${offset.toLocaleString("tr-TR")}). Bu aralıkta Postgres sık sık zaman aşımına düşer — özellikle “»» son sayfa” atlaması. Önce tarih/lig/takım ile sonuç kümesini daraltın veya en fazla ${maxPage.toLocaleString("tr-TR")}. sayfaya kadar gidin.`,
        detail: `limit=${limit} page=${page} maxOffset=${MAX_RANGE_OFFSET}`,
        code: "RANGE_TOO_DEEP",
      },
      { status: 400 }
    );
  }

  const cfTarihRaw = sp.get("cf_tarih")?.trim() ?? "";
  const tarihFiltParts = cfTarihRaw
    ? splitTarihOrPatterns(normalizeTarihFilterInput(cfTarihRaw))
    : [];

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

  const taramaQRaw = sp.get("tarama_q")?.trim() ?? "";
  const taramaQActive = taramaQRaw.length > 0;

  const supabase = createServiceClient();
  // rawKeyUnion RPC sıralı bekleniyor; cf_raw_* filtre yoksa tamamen atla.
  const hasCfRawParams = [...sp.keys()].some((k) => k.startsWith('cf_'));
  const mergedRawCf = hasCfRawParams
    ? buildMergedRawCfColToJsonKey(await fetchRawDataKeyUnion(supabase))
    : {};
  /**
   * Ham raw_data cf_*: id ön-filtresi yoksa exact COUNT tam tablo taranabilir → planned.
   * Ön-filtre (RPC id listesi / trgm) ile daraldıysa exact hem güvenli hem doğru toplam (UI “1.000 maç” yanılsaması olmaz).
   */
  const hasAnyRawCfParam = (() => {
    for (const [k, v] of sp.entries()) {
      if (!k.startsWith("cf_")) continue;
      const colId = k.slice(3);
      if (!resolveRawCfJsonKey(colId, mergedRawCf)) continue;
      const t = String(v ?? "").trim();
      if (!t) continue;
      return true;
    }
    return false;
  })();

  const ksAnyTarih = ksAnyRpcTarihBounds(sp);

  /** İndeks tablosu dolu + taban `matches` sorgusu → URL’de dev id listesi yok; `match_raw_kod_suffix!inner` ile filtre. */
  let ksAnyJoinSpec: { n: number; suffix: number } | null = null;

  const ksAnySuffixParsed = (() => {
    if (!/^\d+$/.test(ksAnySuffixRaw) || ksAnySuffixRaw.length !== ksAnyN || !KS_N_OK.has(ksAnyN)) {
      return null;
    }
    const suffixNum = parseInt(ksAnySuffixRaw, 10);
    if (!Number.isFinite(suffixNum) || suffixNum < 0 || suffixNum >= 10 ** ksAnyN) return null;
    return suffixNum;
  })();

  if (ksAnySuffixParsed !== null) {
    const suffixNum = ksAnySuffixParsed;
    const onSuffixColsView = useKsView && !pickStub;
    /** `count: exact` bazen 0/null dönebiliyor; satır varlığı için limit(1) daha güvenilir. */
    let indexTableHasRows = false;

    if (!onSuffixColsView) {
      const { data: mrsProbe, error: mrsE } = await supabase
        .from("match_raw_kod_suffix")
        .select("match_id")
        .limit(1);
      indexTableHasRows = !mrsE && Array.isArray(mrsProbe) && mrsProbe.length > 0;
      if (indexTableHasRows) {
        ksAnyJoinSpec = { n: ksAnyN, suffix: suffixNum };
      }
    }

    if (!ksAnyJoinSpec) {
      const rpcArgs: Record<string, unknown> = {
        p_suffix: suffixNum,
        p_n: ksAnyN,
      };
      if (ksAnyTarih.p_tarih_from) rpcArgs.p_tarih_from = ksAnyTarih.p_tarih_from;
      if (ksAnyTarih.p_tarih_to) rpcArgs.p_tarih_to = ksAnyTarih.p_tarih_to;

      const { data: idData, error: ksAnyRpcError } = await supabase.rpc(
        "get_matches_by_raw_kod_suffix",
        rpcArgs
      );
      if (ksAnyRpcError) {
        const parts = [
          ksAnyRpcError.message,
          ksAnyRpcError.details,
          ksAnyRpcError.hint,
        ].filter((x): x is string => typeof x === "string" && x.trim().length > 0);
        const timeoutExtra =
          ksAnyRpcError.code === "57014"
            ? " KOD sonek artık indeksli tabloya dayanır: sql/create-get-matches-by-raw-kod-suffix-fn.sql + sql/backfill-match-raw-kod-suffix.sql çalıştırıldı mı? Eski jsonb_each sürümünde kaldıysanız veya backfill bitmediyse zaman aşımı görülebilir."
            : "";
        return NextResponse.json(
          {
            error: `get_matches_by_raw_kod_suffix: ${ksAnyRpcError.message}${timeoutExtra}`,
            detail: parts.slice(1).join(" | ") || undefined,
            code: ksAnyRpcError.code,
          },
          { status: 503 }
        );
      }
      ksAnyFilterIds = normalizeRpcIdArray(idData);
      if (ksAnyFilterIds.length > 50_000) {
        return NextResponse.json(
          {
            error:
              "Bu KOD soneki çok fazla maç döndürüyor (50.000 üstü). Üstte tarih aralığı ile daraltın veya soneği değiştirin.",
            code: "KS_ANY_TOO_MANY",
          },
          { status: 413 }
        );
      }
      if (ksAnyFilterIds.length > 0 && findKsAnyOrChunkSize(ksAnyFilterIds) === null) {
        const errSuffix = onSuffixColsView
          ? "KOD sonek sütun görünümü (matches_with_suffix_cols) açıkken tüm eşleşen id’ler tek istek URL’sine sığmıyor. Üstte tarih aralığı (tarih_from / tarih_to) ile daraltın veya üst KOD sonek (◉) modunu kapatın."
          : "`public.match_raw_kod_suffix` tablosunda satır yok veya API’den okunamıyor (RLS / şema). sql/create-get-matches-by-raw-kod-suffix-fn.sql + sql/backfill-match-raw-kod-suffix.sql ile indeksi doldurun; Supabase’te tablo API’ye açık ve service_role için SELECT izni olduğundan emin olun. Geçici olarak tarih aralığı ile daraltın.";
        return NextResponse.json(
          {
            error: `${errSuffix} (KS_ANY_URL_LIMIT)`,
            code: "KS_ANY_URL_LIMIT",
          },
          { status: 413 }
        );
      }
    }
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
    const jsonKey = resolveRawCfJsonKey(colId, mergedRawCf);
    if (!jsonKey) continue;
    const trimmed = normalizeRawKodWildcardInput(
      jsonKey,
      normalizeCfPipelineBeforeApi(colId, v.trim())
    );

    // KOD* (KODHMS hariç): ham JSON metni padlenmeden joker aranıyordu (ör. 0* → 2072 kaçıyordu).
    const kodWild = getSimpleRawJsonWildcardPattern(trimmed, "prefix");
    if (
      kodWild &&
      !isOnlyPercentIlikePattern(kodWild.pat) &&
      isRawFiveDigitPaddedKodJsonKey(jsonKey)
    ) {
      let kodPreIds: number[] | null = null;
      const { data: idsData, error: kodPadErr } = await supabase.rpc(
        "get_matches_raw_kod_padded_pattern_ids",
        {
          json_key: jsonKey,
          pattern: kodWild.pat,
          case_insensitive: kodWild.ci,
        }
      );
      if (!kodPadErr) {
        kodPreIds = normalizeRpcIdArray(idsData);
      } else {
        // SQL fonksiyonu henüz kurulmadıysa (veya hata verirse) en azından
        // ORDER BY'sız id ön-filtresine düşüp statement timeout riskini azalt.
        const { data: ilikeIds, error: ilikeErr } = await supabase.rpc(
          "get_matches_raw_ilike_ids",
          {
            json_key: jsonKey,
            ilike_pattern: kodWild.pat,
          }
        );
        if (!ilikeErr) {
          kodPreIds = normalizeRpcIdArray(ilikeIds);
        } else {
          // Son çare: doğrudan raw_data ifadesiyle ORDER BY'sız id taraması.
          const rawField = `raw_data->>${jsonKey}`;
          let rawIdQ = supabase.from("matches").select("id");
          rawIdQ = rawIdQ.filter(rawField, kodWild.ci ? "ilike" : "like", kodWild.pat);
          const { data: rawRows, error: rawErr } = await rawIdQ.limit(200000);
          if (!rawErr) {
            kodPreIds = ((rawRows as Array<{ id?: unknown }> | null) ?? [])
              .map((r) => Number(r.id))
              .filter((n) => Number.isFinite(n));
          }
        }
      }
      // Boş id listesiyle prefilter + erken boş dönüş, ana sorgudaki pad/LIKE+match
      // yolunu (örn. 0* → 02072) tamamen atlıyordu — yalnızca gerçekten id varsa IN uygula.
      // Çok geniş eşleşme (*64 vb.): id listesi URL’ye sığmazsa tek dev id.in → 400; ön-filtreyi atla.
      if (kodPreIds !== null && kodPreIds.length > 0 && ksAnyIdListFitsPostgrestUrl(kodPreIds)) {
        preFilterColIds.add(colId);
        idSetsForIntersect.push(kodPreIds);
      }
      continue;
    }

    const ilikePattern = getSimpleIlikePattern(trimmed);
    if (!ilikePattern) continue; // OR/AND karmaşığı → eski yol
    if (isOnlyPercentIlikePattern(ilikePattern)) continue; // "*" gibi tümü-eşleşen desenlerde RPC ön-filtreleme yapma

    // get_matches_raw_ilike_ids: ORDER BY olmadan trgm index kullanır
    const { data: idsData } = await supabase.rpc("get_matches_raw_ilike_ids", {
      json_key: jsonKey,
      ilike_pattern: ilikePattern,
    });
    const ilikeIds = normalizeRpcIdArray(idsData);
    if (ilikeIds.length > 0 && ksAnyIdListFitsPostgrestUrl(ilikeIds)) {
      preFilterColIds.add(colId);
      idSetsForIntersect.push(ilikeIds);
    }
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

  /**
   * `planned` / istatistik tabanlı sayım — seçici filtrede (KOD `*9` vb.) sık 1.000’e
   * yakın yanlış toplam (Supabase db-max-rows + tahmin eşiği). Tarama / ks_any /
   * cf_* varken de `exact` kullan; ağır yalnızca ham raw joker + id ön-filtre yokken.
   *
   * Ön-filtre id listesi URL’ye sığmayacak kadar genişse (*64 vb.) id IN uygulanmaz;
   * bu durumda da ham cf ile tam tarama → planned.
   */
  const rawCfWithoutIdPrefilter =
    hasAnyRawCfParam &&
    (preFilteredIds === null ||
      preFilteredIds.length === 0 ||
      !ksAnyIdListFitsPostgrestUrl(preFilteredIds));
  const hasAnyFilter = (() => {
    for (const [k, v] of sp.entries()) {
      if (!v?.trim()) continue;
      if (k === 'page' || k === 'limit' || k === 'with_okbt' || k === 'okbt_cols' || k === 'skip_raw_data') continue;
      return true;
    }
    return false;
  })();
  const countMode: 'exact' | 'planned' = (!hasAnyFilter || rawCfWithoutIdPrefilter) ? 'planned' : 'exact';

  const fromTable = useKsView && !pickStub ? "matches_with_suffix_cols" : "matches";
  // Sadece istenen OKBT col'ları seç (whitelist ile doğrula). with_okbt=1 eskiyle uyumluluk için korunur.
  const OKBT_EXTRA_SET = new Set(DB_COLS_OKBT_EXTRA);
  const okbtColsParam = sp.get("okbt_cols");
  const withOkbt = sp.get("with_okbt") !== "0"; // geriye dönük uyumluluk
  const requestedOkbtCols: string[] = okbtColsParam
    ? okbtColsParam.split(",").map((s) => s.trim()).filter((c) => OKBT_EXTRA_SET.has(c))
    : withOkbt && !okbtColsParam // eski with_okbt=1, okbt_cols yoksa tam liste (eski istemciler)
    ? DB_COLS_OKBT_EXTRA
    : [];
  // raw_data büyük JSONB (eski satırlarda 900+ key); raw_* sütun/filtre yoksa çekme.
  const skipRawData = sp.get("skip_raw_data") === "1";
  const baseColsFiltered = skipRawData ? DB_COLS_BASE.filter((c) => c !== "raw_data") : DB_COLS_BASE;
  const selectCols = pickStub ? PICK_STUB_COLS : [...baseColsFiltered, ...requestedOkbtCols];
  let selectListStr = selectCols.join(",");
  if (ksAnyJoinSpec) {
    selectListStr = `${selectListStr},match_raw_kod_suffix!inner(n,suffix)`;
  }
  let query = pickStub
    ? supabase.from(fromTable).select(selectListStr)
    : supabase.from(fromTable).select(selectListStr, { count: countMode });

  // Sıfır eşleşme → hemen boş dön
  if (preFilteredIds !== null && preFilteredIds.length === 0) {
    return NextResponse.json({ data: [], page, limit, total: 0, totalPages: 0 });
  }
  if (preFilteredIds !== null) {
    // Tek `id=in.(…)` çok uzun URL → proxy/PostgREST kesintisi; toplam sayım ~1000’de takılıyordu.
    // ks_any ile aynı: parçalı in + or (KS_ANY_OR_MAX_LEN).
    const idFiltered = applyKsAnyIdListFilter(query, preFilteredIds);
    if (idFiltered == null) {
      preFilterColIds.clear();
      preFilteredIds = null;
    } else {
      query = idFiltered;
    }
  }
  if (ksAnyJoinSpec) {
    query = query
      .eq("match_raw_kod_suffix.n", ksAnyJoinSpec.n)
      .eq("match_raw_kod_suffix.suffix", ksAnyJoinSpec.suffix);
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

  if (sp.get("lig")) {
    const pat = plainOrWildcardIlikePattern(sp.get("lig")!);
    if (pat) query = query.ilike("lig_adi", pat);
  }
  if (sp.get("alt_lig")) {
    const pat = plainOrWildcardIlikePattern(sp.get("alt_lig")!);
    if (pat) query = query.ilike("alt_lig_adi", pat);
  }
  if (sp.get("takim")) {
    const pat = plainOrWildcardIlikePattern(sp.get("takim")!);
    if (pat) {
      const esc = pat.replace(/"/g, '""');
      query = query.or(`t1.ilike."${esc}",t2.ilike."${esc}"`);
    }
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
        const buildContainsPat = (p: string) => plainOrWildcardIlikePattern(p);
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
    const makePat = (p: string) => plainOrWildcardIlikePattern(p);
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
  if (sp.get("sonuc_iy")) {
    query = applyCfSkorColumnFilter(query, "sonuc_iy", sp.get("sonuc_iy")!.trim());
  }
  if (sp.get("sonuc_ms")) {
    query = applyCfSkorColumnFilter(query, "sonuc_ms", sp.get("sonuc_ms")!.trim());
  }
  if (sp.get("hakem")) {
    query = applyCfTextColumnIlikeFilter(query, "hakem", sp.get("hakem")!.trim());
  }
  if (sp.get("suffix4")) {
    query = applyCfTextColumnIlikeFilter(query, "mac_suffix4", sp.get("suffix4")!.trim());
  }
  if (sp.get("suffix3")) {
    query = applyCfTextColumnIlikeFilter(query, "msmkt_display", sp.get("suffix3")!.trim());
  }

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
    const v = normalizeCfPipelineBeforeApi(colId, val.trim());
    if (colId === "saat") {
      query = applyCfSaatColumnFilter(query, v);
      continue;
    }
    if (colId === "gun") {
      query = applyCfGunColumnFilter(query, v);
      continue;
    }
    const msCol = MS_ODDS_DB_COL[colId];
    if (msCol) {
      query = applyMsOddsCfFilter(query, msCol, v);
      continue;
    }
    const def = DB_COL_MAP[colId];
    if (def) {
      if (CODE_ILIKE_ARAMA[colId]) {
        const paddedRpc = unboxPostgrestChain(
          await tryApplySchemaKodPaddedSuffixRpc(
            query,
            supabase,
            def.col as "id" | "kod_ms" | "kod_iy" | "kod_cs" | "kod_au",
            v
          ),
        );
        query = paddedRpc ?? applyCodeColumnPatternFilter(query, colId, v);
        continue;
      }
    if (def.mode === "ilike") {
        if (def.col === "sonuc_iy" || def.col === "sonuc_ms") {
          query = applyCfSkorColumnFilter(query, def.col, v);
        } else {
          // saat_arama dahil tüm metin sütunları: düz metin = tam eşleşme,
          // joker istiyorsa kullanıcı * / ? açıkça yazar (örn. 14*, 19:??).
          query = applyCfTextColumnIlikeFilter(query, def.col, v);
        }
    } else if (def.mode === "eq") {
        // id (bigint) için özel: sayıya çevir; tam sayı kimlik sütunlarında joker → ::text ilike
      if (def.col === "id") {
          const paddedRpc = unboxPostgrestChain(
            await tryApplySchemaKodPaddedSuffixRpc(query, supabase, "id", v),
          );
          query = paddedRpc ?? applyGenericFilter(query, def.col, v, "prefix", false);
        } else if (INTEGER_EQ_CF_COLS.has(def.col)) {
          query = applyCfIntegerEqColumnFilter(query, def.col, v);
      } else {
        const n = Number(v);
        query = query.eq(def.col, Number.isFinite(n) ? n : v);
      }
    }
      continue;
    }
    // Çok kaynaklı OKBT: {srcId}_obktb_{idx}
    // PostgREST computed column filtresi ile doğrudan WHERE'e çeviriyoruz.
    // - macid (7 haneli): m7_obktb_{idx}  (sql/add-okbt-full-7digit-03-m7-functions.sql)
    // - t1i / t2i / kodms / kodiy / kodcs / kodau (5 haneli): {src}_obktb_{idx}
    //   (sql/add-matches-okbt-multi-computed-col-functions.sql + add-okbt-2li-5digit-03)
    // Sayısal + `_` boş + `+` AND sunucuda; `* ?` joker ayrı; kalan karmaşık → istemci.
    const parsedObktb = parseObktbSrcIdx(colId);
    if (parsedObktb) {
      const fnName =
        parsedObktb.src === "macid"
          ? `m7_obktb_${parsedObktb.idx}`
          : `${parsedObktb.src}_obktb_${parsedObktb.idx}`;
      const obktV = normalizeOkbtCfInput(v);
      const obktbGroups = parseObktbServerOrGroups(obktV);
      if (obktbGroups) {
        const topSegments = obktbGroups
          .map((andSegs) => {
            const inner = andSegs.map((s) => okbtSegToPostgrestStr(fnName, s)).filter(Boolean);
            return inner.length > 1 ? `and(${inner.join(",")})` : inner[0] ?? "";
          })
          .filter(Boolean);
        if (topSegments.length) query = query.or(topSegments.join(","));
        continue;
      }
      // Joker (* ?) ve virgül-OR / +-AND karışımı: 0..99 genişletme (örn. `1*,25`)
      const wild = tryExpandOkbtMixedWildOr(obktV);
      if (wild?.kind === "all") {
        continue;
      }
      if (wild?.kind === "none") {
        query = query.eq("id", -1);
        continue;
      }
      if (wild?.kind === "ints") {
        const { ints } = wild;
        if (ints.length === 1) query = query.eq(fnName, ints[0]!);
        else query = query.in(fnName, ints);
        continue;
      }
      continue; // karmaşık ifade → istemcide
    }

    const jsonKey = resolveRawCfJsonKey(colId, mergedRawCf);
    if (jsonKey) {
      if (preFilterColIds.has(colId)) continue; // leading-wildcard → zaten id IN ile filtrelendi
      query = unboxPostgrestChain(await applyRawJsonPathIlikeFilterAsync(query, supabase, jsonKey, v));
    }
  }

  if (useKsView && !pickStub && ksSuffixNum !== null) {
    query = query.eq(`sfx_${ksRef}_${ksN}`, ksSuffixNum);
  }

  if (!ksAnyJoinSpec && ksAnyFilterIds !== null) {
    if (ksAnyFilterIds.length === 0) {
      query = query.in("id", [-1]);
    } else {
      const ksQ = applyKsAnyIdListFilter(query, ksAnyFilterIds);
      if (ksQ == null) {
        return NextResponse.json(
          {
            error:
              "KOD sonek eşleşmesi çok geniş; sonuç id listesi istek URL sınırına sığmıyor. Üstte tarih aralığı ile daraltın veya farklı sonek deneyin.",
            code: "KS_ANY_URL_LIMIT",
          },
          { status: 413 }
        );
      }
      query = ksQ;
    }
  }

  if (taramaQActive && !pickStub) {
    query = applyTaramaQuickSearchFilter(query, taramaQRaw);
  }

  if (oynanmamisOnly) {
    const enDash = "\u2013";
    query = query.or(`sonuc_ms.is.null,sonuc_ms.eq.-,sonuc_ms.eq.${enDash}`);
  }

  // Sayım (HEAD) ile sayfalı veri (GET) sırayı bekletmesin: URL anlık kopyalanır,
  // GET zinciri order/range ile aynı nesneyi güncellemeden önce HEAD başlar.
  const headCarrier: PostgrestUrlCarrier = {
    url: new URL((query as unknown as { url: URL }).url.toString()),
    headers: (query as unknown as { headers: Headers }).headers,
  };
  // planned modda HEAD extra round-trip; count GET yanıtında zaten geliyor.
  // Free-tier'da paralel bağlantı havuzu sınırlı: bir istek kazanımı yeterli.
  const headPromise = (pickStub || countMode === 'planned')
    ? Promise.resolve<number | null>(null)
    : postgrestHeadRowCount(headCarrier, countMode);

  const orderTarihAsc = pickStub;
  const { data, count, error } = await query
    .order("tarih", { ascending: orderTarihAsc })
    .order("saat", {
      ascending: orderTarihAsc,
      nullsFirst: orderTarihAsc,
    })
    .range(offset, offset + limit - 1);

  if (error) {
    await headPromise.catch(() => {});
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    const msg = [e.message, e.details, e.hint, e.code].filter(Boolean).join(" | ");
    const statementTimeout =
      e.code === "57014" ||
      /statement timeout|canceling statement due to statement timeout/i.test(msg);
    if (statementTimeout) {
      const taramaHint = taramaQActive
        ? " Tarama (MAÇ ARA): çok sütunda ILIKE tam tarama ağırdır — sql/add-matches-tarama-trgm-indexes.sql (t1/t2/lig gin_trgm) çalıştırın; mümkünse tarih/lig/sütun ile önce sonuç kümesini daraltın. "
        : "";
      return NextResponse.json(
        {
          error:
            `${taramaHint}Sorgu zaman aşımı. Saat: düz HH:MM artık saat_arama.eq + indeks (sql/add-matches-saat-arama-index.sql). MS karşılaştırma: ms*_n + add-matches-ms-odds-numeric-generated-cols.sql indeksleri. Kod sonek: create-matches-suffix-view.sql + add-matches-suffix-expression-indexes. Ham veri cf_*: pg_trgm / expression index; gerekirse Supabase statement_timeout. CONCURRENTLY → *-concurrent.sql (psql).`,
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
    const missingSaatArama =
      /saat_arama/i.test(msg) ||
      (e.code === "42703" && /saat_arama/i.test(msg)) ||
      /schema cache.*saat_arama|Could not find.*saat_arama/i.test(msg);
    if (missingSaatArama) {
      return NextResponse.json(
        {
          error:
            "saat_arama kolonu yok (Saat sütunu time tipi; ILIKE için metin kolonu gerekir). sql/add-matches-saat-arama-column.sql çalıştırın; kod sonek görünümü kullanıyorsanız create-matches-suffix-view.sql ile yenileyin.",
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
    const missingRawKodSuffixFn =
      !!ksAnySuffixRaw &&
      (/get_matches_by_raw_kod_suffix/i.test(msg) ||
        (e.code === "42883" && /get_matches_by_raw_kod_suffix/i.test(msg)));
    if (missingRawKodSuffixFn) {
      return NextResponse.json(
        {
          error:
            "KOD son hane (raw_data KOD*) filtresi için fonksiyon eksik. sql/create-get-matches-by-raw-kod-suffix-fn.sql dosyasını Supabase SQL Editor’de çalıştırın.",
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
    const missingMktMsmktDisplay =
      e.code === "42703" &&
      (/mkt_display|msmkt_display/i.test(msg) ||
        /column .*mkt_display|column .*msmkt_display/i.test(msg));
    if (missingMktMsmktDisplay) {
      return NextResponse.json(
        {
          error:
            "MKT / MsMKT sütun süzümü ve doğru toplam sayısı için `matches.mkt_display` ve `matches.msmkt_display` kolonları gerekir. sql/add-matches-mkt-display-from-id.sql (+ backfill) ve sql/add-matches-msmkt-display-from-kod-ms.sql (+ backfill) çalıştırın; ardından sql/create-matches-suffix-view.sql ile görünümü yenileyin.",
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
    const missingMsOddsNumeric =
      e.code === "42703" &&
      /\bms[12x]_n\b/i.test(msg) &&
      /column .* does not exist|Perhaps you meant/i.test(msg);
    if (missingMsOddsNumeric) {
      return NextResponse.json(
        {
          error:
            "Maç sonucu oran karşılaştırması için ms1_n / msx_n / ms2_n kolonları yok. Supabase’te (Vercel’in bağlandığı proje) sql/add-matches-ms-odds-numeric-cols-batched.sql + backfill, ardından sql/add-matches-ms-odds-numeric-cols-indexes.sql; görünüm varsa create-matches-suffix-view.sql ile yenileyin.",
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
    const missingObktbServerFilter =
      /get_matches_by_obktb_range|okbt7_basamak_toplam/i.test(msg) &&
      (e.code === "42883" || /function.*does not exist|Could not find.*function/i.test(msg));
    if (missingObktbServerFilter) {
      return NextResponse.json(
        {
          error:
            "OKBT sunucu-taraflı filtre fonksiyonları eksik. sql/add-okbt-digit-sum-server-filter.sql dosyasını Supabase SQL Editor'de çalıştırın (OKBT filtreleri sayfalamayla tutarlı kalsın diye).",
          detail: msg,
          code: e.code,
        },
        { status: 503 }
      );
    }
    const ksAnyJoinHint =
      ksAnyJoinSpec &&
      (/match_raw_kod_suffix|PGRST200|PGRST204|Could not find a relationship|schema cache/i.test(msg) ||
        e.code === "PGRST200");
    if (ksAnyJoinHint) {
      return NextResponse.json(
        {
          error:
            "KOD* son N (indeks join) şemada çözülemedi. public.match_raw_kod_suffix FK’sı ve sql/create-get-matches-by-raw-kod-suffix-fn.sql kurulumunu doğrulayın; Supabase şema önbelleğini yenileyin.",
          detail: msg,
          code: e.code,
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: e.message ?? "Bilinmeyen hata", detail: msg, code: e.code }, { status: 500 });
  }

  const headTotal = await headPromise;

  type RawRow = Record<string, unknown>;
  const rows = ((data as unknown) as RawRow[] || []).map((row: RawRow) => {
    const rd = (row["raw_data"] as Record<string, unknown>) ?? {};
    const flat: Record<string, unknown> = { ...row };
    delete flat["match_raw_kod_suffix"];
    // raw_data'yı koru (panel için lazım), ama içindeki alanları da düzleştir
    for (const [k, v] of Object.entries(rd)) {
      flat[k] = flattenRawValue(v);
    }
    return flat;
  });

  // planned sayım PG istatistiklerinden geldiği için özellikle seçici filtrelerde
  // (ör. saat_arama ILIKE '21' → gerçekte 0) çok sapabiliyor. İlk sayfa boşsa
  // ve sonraki sayfa olamaz (offset=0, satır yok) → total'i 0 olarak döndür ki
  // UI'de "yaklaşık X maç" yanılsaması olmasın.
  let total = headTotal ?? count ?? 0;
  // Supabase projeleri varsayılan `db-max-rows = 1000` (Dashboard → Settings →
  // API → Max Rows). Bu sınırla `count=exact` bile 1.000’de takılır ve `*6` gibi
  // jokerlerde toplam yanlış görünür. RPC ön-filtre `preFilteredIds.length` ise
  // KOD* deseni için **kesin** eşleşme sayısıdır. Toplam 0 veya tam 1.000’de
  // takılıysa ve ön-filtre tavanı bundan büyükse onu kullan; tarih/lig/skor
  // gibi daraltıcı filtreler GET `count`’u zaten 1.000’in altına çekerse o
  // değeri olduğu gibi bırak (gerçek alt küme).
  const preFilterCount = preFilteredIds !== null ? preFilteredIds.length : null;
  if (
    preFilterCount !== null &&
    preFilterCount > total &&
    (total === 0 || total === 1000)
  ) {
    total = preFilterCount;
  }
  if (pickStub) {
    total = rows.length;
  } else if (rows.length === 0 && page === 1) {
    total = 0;
  } else if (countMode === "planned" && headTotal === null) {
    // planned tahmin << gerçek olduğunda (özellikle son sayfa dışında) en azından
    // elimizdeki satırları yansıtacak kadar yüksek tutalım.
    const minTotal = (page - 1) * limit + rows.length;
    if (total < minTotal) total = minTotal;
  }
  const totalPages = pickStub ? 1 : Math.ceil(total / limit);
  return NextResponse.json({
    data: rows,
    page,
    limit,
    total,
    totalPages,
    ...(pickStub ? { pickerPartial: rows.length >= limit } : {}),
  });
}
