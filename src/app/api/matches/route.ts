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
import { expandOkbtWildcardFilter } from "@/lib/okbt-wildcard-server-expand";
import { parsePlainSkorTokenWithBlankSuffix } from "@/lib/score-filter-parse";

/** Tarih ILIKE + büyük tablo: exact count ağır; planned + süre sınırı zaman aşımını azaltır. */
/** KOD* sonek RPC tam tablo taraması uzun sürebilir; Vercel planda üst sınırı aşarsanız düşürün. */
export const maxDuration = 300;

function flattenRawValue(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

/** PostgREST select: `cf_*_obktb_*` WHERE ile aynı generated ifadeler (satırda değer dönsün). */
const OKBT_MULTI_COMPUTED_COLS: string[] = [
  ...Array.from({ length: 20 }, (_, i) => `macid7_obktb_${i}`),
  ...(["t1i", "t2i", "kodms", "kodiy", "kodcs", "kodau"] as const).flatMap((src) =>
    Array.from({ length: 15 }, (_, i) => `${src}_obktb_${i}`),
  ),
];

const DB_COLS = [
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
  ...OKBT_BASAMAK_LABELS.map((_, i) => `obktb_${i}`),
  ...OKBT_MULTI_COMPUTED_COLS,
];

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
  return `${field}.is.null,${field}.eq.""`;
}

function postgrestSkorFieldEmptyOrExpr(field: string): string {
  return `${field}.is.null,${field}.eq."",${field}.eq."-",${field}.eq."–"`;
}

function postgrestMsOddsEmptyOrExpr(textField: string, numField: string): string {
  return `${textField}.is.null,${textField}.eq."",${numField}.is.null`;
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
  plainEqAsIlike = true
): any {
  const t = v.trim();
  if (t === "_") {
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
      return applyParsedFilterBranch(query, field, parseFilterBranch(ap, defaultWrap), plainEqAsIlike);
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
    if (isBlankCellOrToken(p)) {
      return q.or(`${col}.is.null`);
    }
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
      return arama ? `${arama}.${b.kind}."${b.pat.replace(/"/g, '""')}"` : "";
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

  const applyOne = (q: any, p: string): any => {
    if (isBlankCellOrToken(p)) {
      return q.or(`${col}.is.null`);
    }
    const b = parseFilterBranch(p.trim(), "prefix");
    if (b.kind === "like" || b.kind === "ilike") return q[b.kind](arama, b.pat);
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
    if (b.kind === "like" || b.kind === "ilike") return `${arama}.${b.kind}."${b.pat.replace(/"/g, '""')}"`;
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
 * Sade değer → tam eşleşme; * ? ile desen araması.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST zinciri
function applyRawJsonPathIlikeFilter(query: any, jsonKey: string, v: string): any {
  if (!SAFE_RAW_JSON_KEY.test(jsonKey)) return query;
  return applyGenericFilter(query, `raw_data->>${jsonKey}`, v, "prefix");
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
    return `${textField}.${b.kind}.${qstr(b.pat)}`;
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

/** Virgül-VEYA / +-VE ile bile yalnızca düz skor tokenları mı (exact count gerekir). */
function isPlainSkorFilterValue(raw: string): boolean {
  const orParts = splitOrParts(raw.trim());
  if (!orParts.length) return false;
  for (const orPart of orParts) {
    const andParts = splitAndParts(orPart);
    if (!andParts.length) return false;
    for (const ap of andParts) {
      if (!isPlainSkorToken(ap)) return false;
    }
  }
  return true;
}

function plainSkorFilterHasBlankAtom(raw: string): boolean {
  const orParts = splitOrParts(raw.trim());
  for (const orPart of orParts) {
    for (const ap of splitAndParts(orPart)) {
      if (isBlankCellOrToken(ap)) return true;
    }
  }
  return false;
}

/** Düz İY/MS skoru → PostgREST planned count sapmasın diye exact count. */
function spRequestsPlainSkorExactCount(sp: URLSearchParams): boolean {
  const candidates = [sp.get("sonuc_ms"), sp.get("sonuc_iy"), sp.get("cf_sonuc_ms"), sp.get("cf_sonuc_iy")];
  for (const v of candidates) {
    const t = v?.trim();
    if (!t) continue;
    if (plainSkorFilterHasBlankAtom(t)) continue;
    if (isPlainSkorFilterValue(t)) return true;
  }
  return false;
}

/**
 * Saat sütunu (saat_arama): planned sayım seçici ILIKE / prefix desenlerde çok küçük
 * kalabiliyor (örn. gerçek on binlerce satır varken total ~ yüzlerce) → sayfalama erken biter.
 * Prefix / tam eşleşme btree (text_pattern_ops) ile exact count genelde kabul edilebilir.
 */
function spRequestsSaatExactCount(sp: URLSearchParams): boolean {
  return Boolean(sp.get("cf_saat")?.trim());
}

/**
 * cf_tarih dışında herhangi bir cf_* parametresi varken planned sayım,
 * istatistik tahminine yakın kalabiliyor (örn. cf_t1=Midtjylland → gerçek 161 satır
 * varken ~263 gösterimi, boş 3. sayfa). Sayfalama doğru olsun diye exact count.
 * Yalnız cf_tarih iken planned kalır (geniş tarama + ağır COUNT riski).
 */
function spRequestsCfOtherThanTarih(sp: URLSearchParams): boolean {
  for (const [k, v] of sp.entries()) {
    if (!k.startsWith("cf_") || !String(v ?? "").trim()) continue;
    if (k === "cf_tarih") continue;
    return true;
  }
  return false;
}

/**
 * cf_tarih dışındaki URL parametreleriyle küçük sonuç kümesi beklenirken planned sayım
 * (ör. cf_tarih + bidir_takim_ev, veya yalnız üst `takim=` / `ks_any_*`) toplamı şişirir.
 * cf_tarih tek başına burada yok — o durumda planned kalmaya devam eder.
 */
function spHasNarrowingListFilter(sp: URLSearchParams): boolean {
  const keys = [
    "bidir_takim_ev",
    "bidir_takim_dep",
    "bidir_takim",
    "bidir_takimid_ev",
    "bidir_takimid_dep",
    "bidir_takimid",
    "bidir_hakem",
    "bidir_ant_ev",
    "bidir_ant_dep",
    "bidir_ant",
    "bidir_personel",
    "takim",
    "lig",
    "alt_lig",
    "hakem",
    "sonuc_iy",
    "sonuc_ms",
    "suffix3",
    "suffix4",
    "tarama_q",
    "ks_any_suffix",
    "oynanmamis",
  ];
  for (const k of keys) {
    if (String(sp.get(k) ?? "").trim()) return true;
  }
  if (String(sp.get("ks_ref") ?? "").trim() && String(sp.get("ks_suffix") ?? "").trim()) return true;
  return false;
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
  const emptyExpr = `${col}.is.null,${col}.eq."",${col}.eq."-",${col}.eq."–"`;
  if (!v) return query;
  if (v === "_") {
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

  /**
   * Ağır filtrelerde exact COUNT ikinci tam tarama yapar → zaman aşımı; planned yaklaşık sayım.
   * Düz İY/MS skoru (ör. 4-2) varken planned toplam SQL COUNT ile uyuşmayabiliyor → exact zorunlu.
   */
  const taramaQRaw = sp.get("tarama_q")?.trim() ?? "";
  const taramaQActive = taramaQRaw.length > 0;

  /** OKBT basamak filtresi (cf_*_obktb_*) seçici → planned count sayfa-satır düzeyine düşer.
   *  Filtreliyken gerçek toplamı göstermek için exact zorla (performans pratikte sorun değil: idx var). */
  const hasObktbCfParam = (() => {
    for (const k of sp.keys()) {
      if (!k.startsWith("cf_")) continue;
      const colId = k.slice(3);
      if (/^[a-z][a-z0-9]*_obktb_\d+$/.test(colId) && (sp.get(k) ?? "").trim()) return true;
    }
    return false;
  })();

  const forceExactCount =
    spRequestsPlainSkorExactCount(sp) ||
    spRequestsSaatExactCount(sp) ||
    hasObktbCfParam ||
    spRequestsCfOtherThanTarih(sp) ||
    spHasNarrowingListFilter(sp);
  const countMode = forceExactCount
    ? ("exact" as const)
    : tarihFiltParts.length > 0 || (useKsView && !pickStub) || hasAnyCfParam || !!ksAnySuffixRaw || taramaQActive
      ? ("planned" as const)
      : ("exact" as const);

  const supabase = createServiceClient();
  const mergedRawCf = buildMergedRawCfColToJsonKey(await fetchRawDataKeyUnion(supabase));

  const ksAnyTarih = ksAnyRpcTarihBounds(sp);

  // ks_any_suffix: raw_data içindeki tüm KOD* anahtarlarında son N hane (get_matches_by_raw_kod_suffix)
  if (
    /^\d+$/.test(ksAnySuffixRaw) &&
    ksAnySuffixRaw.length === ksAnyN &&
    KS_N_OK.has(ksAnyN)
  ) {
    const suffixNum = parseInt(ksAnySuffixRaw, 10);
    if (Number.isFinite(suffixNum) && suffixNum >= 0 && suffixNum < 10 ** ksAnyN) {
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
      ksAnyFilterIds = (idData as number[] | null) ?? [];
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

  const fromTable = useKsView && !pickStub ? "matches_with_suffix_cols" : "matches";
  const selectCols = pickStub ? PICK_STUB_COLS : DB_COLS;
  let query = pickStub
    ? supabase.from(fromTable).select(selectCols.join(","))
    : supabase.from(fromTable).select(selectCols.join(","), { count: countMode });

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
    const pat = plainOrWildcardIlikePattern(sp.get("hakem")!);
    if (pat) query = query.ilike("hakem", pat);
  }
  if (sp.get("suffix4")) {
    const pat = plainOrWildcardIlikePattern(sp.get("suffix4")!);
    if (pat) query = query.ilike("mac_suffix4", pat);
  }
  if (sp.get("suffix3")) {
    const pat = plainOrWildcardIlikePattern(sp.get("suffix3")!);
    if (pat) query = query.ilike("msmkt_display", pat);
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
    const v = val.trim();
    if (colId === "saat") {
      query = applyCfSaatColumnFilter(query, v);
      continue;
    }
    if (colId === "gun") {
      query = applyCfTextColumnIlikeFilter(query, "tarih_tr_gunlu", gunCfValueForSubstringIlike(v));
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
        query = applyCodeColumnPatternFilter(query, colId, v);
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
          query = applyGenericFilter(query, def.col, v, "prefix", false);
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
    // - macid (7 haneli): macid7_obktb_{idx}  (sql/add-macid7-obktb-computed-cols.sql)
    // - t1i / t2i / kodms / kodiy / kodcs / kodau (5 haneli): {src}_obktb_{idx}
    //   (sql/add-matches-okbt-multi-computed-col-functions.sql)
    // Sayısal + `_` boş + `+` AND sunucuda; `* ?` joker ayrı; kalan karmaşık → istemci.
    const parsedObktb = parseObktbSrcIdx(colId);
    if (parsedObktb) {
      const fnName =
        parsedObktb.src === "macid"
          ? `macid7_obktb_${parsedObktb.idx}`
          : `${parsedObktb.src}_obktb_${parsedObktb.idx}`;
      const obktbGroups = parseObktbServerOrGroups(v);
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
      // Joker (* ?) tek parça: 0..99 ile genişlet — sayfalama + istemci-only tutarsızlığını önler
      const wild = expandOkbtWildcardFilter(v);
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

    const jsonKey = mergedRawCf[colId];
    if (jsonKey) {
      if (preFilterColIds.has(colId)) continue; // leading-wildcard → zaten id IN ile filtrelendi
      query = applyRawJsonPathIlikeFilter(query, jsonKey, v);
    }
  }

  if (useKsView && !pickStub && ksSuffixNum !== null) {
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

  if (taramaQActive && !pickStub) {
    query = applyTaramaQuickSearchFilter(query, taramaQRaw);
  }

  if (oynanmamisOnly) {
    const enDash = "\u2013";
    query = query.or(`sonuc_ms.is.null,sonuc_ms.eq.-,sonuc_ms.eq.${enDash}`);
  }

  const orderTarihAsc = pickStub;
  const { data, count, error } = await query
    .order("tarih", { ascending: orderTarihAsc })
    .order("saat", {
      ascending: orderTarihAsc,
      nullsFirst: orderTarihAsc,
    })
    .range(offset, offset + limit - 1);

  if (error) {
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    const msg = [e.message, e.details, e.hint].filter(Boolean).join(" | ");
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

  // planned sayım PG istatistiklerinden geldiği için özellikle seçici filtrelerde
  // (ör. saat_arama ILIKE '21' → gerçekte 0) çok sapabiliyor. İlk sayfa boşsa
  // ve sonraki sayfa olamaz (offset=0, satır yok) → total'i 0 olarak döndür ki
  // UI'de "yaklaşık X maç" yanılsaması olmasın.
  let total = count ?? 0;
  if (pickStub) {
    total = rows.length;
  } else if (rows.length === 0 && page === 1) {
    total = 0;
  } else if (countMode === "planned") {
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
