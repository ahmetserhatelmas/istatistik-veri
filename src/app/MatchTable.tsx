"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ALL_COLS,
  CF_CLIENT_ONLY_COL_IDS,
  OKBT_MULTI_SOURCE_MAP,
  DEFAULT_VISIBLE,
  GROUP_COLORS,
  mergeAllCols,
  type ColDef,
} from "@/lib/columns";
import { readMbsFromOranRecord } from "@/lib/oran-api";
import { okbtBasamakHucreDegeri, okbt7BasamakHucreDegeri, OKBT_7_IDX_COUNT } from "@/lib/okbt-basamak-toplamlari";
import { supabase } from "@/lib/supabase/client";
import { parsePlainSkorTokenWithBlankSuffix } from "@/lib/score-filter-parse";
import { EslestirmePaneli, type EslestirmeScope } from "./EslestirmePaneli";
import { AuthBar } from "./AuthBar";
import { SavedFiltersPanel } from "./SavedFiltersPanel";
import { TaramaModu } from "./TaramaModu";

type Match = Record<string, unknown>;

/** ◉ panel + KOD son elle: raw_data’daki KOD* alanlarında son N hane (API ks_any_*). */
type AnyKodSuffixState = { digits: string; n: number };

function formatAnyKodSuffixLabel(s: AnyKodSuffixState): string {
  return `KOD* son ${s.n} = ${s.digits}`;
}

/** Sağ-tık → son hane filtresi paneli */
type CodePickEntry = { key: string; colId: string; value: number };
type CodePickPanel = { entries: CodePickEntry[]; x: number; y: number } | null;

/** Üst düzey + bir seviye iç içe nesne — get_matches_by_raw_kod_suffix ile aynı kapsam. */
function collectKodCodePickEntries(rd: Record<string, unknown>): CodePickEntry[] {
  const entries: CodePickEntry[] = [];
  const seen = new Set<string>();
  const push = (k: string, v: unknown) => {
    if (!k.startsWith("KOD")) return;
    const raw = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (!Number.isFinite(raw)) return;
    if (seen.has(k)) return;
    seen.add(k);
    const intVal = Math.abs(Math.round(raw));
    entries.push({ key: k, colId: k.toLowerCase(), value: intVal });
  };
  for (const [k, v] of Object.entries(rd)) {
    push(k, v);
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
        push(k2, v2);
      }
    }
  }
  entries.sort((a, b) => a.key.localeCompare(b.key));
  return entries;
}

interface ApiResponse {
  data?: Match[];
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  error?: string;
  /** Sunucu birleşik hata; eski alan adı */
  detail?: string;
  code?: string;
  /** pick=stb yanıtı: limit dolu mu (daha fazla oynanmamış maç olabilir) */
  pickerPartial?: boolean;
}

type PickerMatchRow = {
  id: number;
  tarih?: string | null;
  saat_arama?: string | null;
  saat?: string | null;
  lig_adi?: string | null;
  lig_kodu?: string | null;
  t1?: string | null;
  t2?: string | null;
  kod_ms?: number | null;
};

function normalizePickerRowTarihIso(raw: unknown): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return "";
}

function formatSaatCfFromPickerRow(row: PickerMatchRow): string {
  const a = typeof row.saat_arama === "string" ? row.saat_arama.trim() : "";
  if (a) return a;
  const t = row.saat;
  if (typeof t === "string" && t.length >= 5) return t.slice(0, 5);
  return "";
}

function formatPickerOptionLabel(row: PickerMatchRow): string {
  const sa =
    (typeof row.saat_arama === "string" && row.saat_arama.trim()) ||
    (typeof row.saat === "string" ? row.saat.slice(0, 5) : "") ||
    "—";
  const t1 = (typeof row.t1 === "string" && row.t1.trim()) || "?";
  const t2 = (typeof row.t2 === "string" && row.t2.trim()) || "?";
  return `${sa} — ${row.id} — ${t1} & ${t2}`;
}

function formatLastSyncTr(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

// ── wildcard / tam eşleşme filtre ─────────────────────────────────────────────
const SCORE_COLS = new Set(["sonuc_iy", "sonuc_ms"]);

// "," → OR, "+" → AND (sunucu tarafı ile tutarlı); joker yoksa tam metin eşleşmesi
function matchWildcard(value: string, pattern: string): boolean {
  const val = value.trim().toLowerCase();
  const orParts = pattern.split(",").map((s) => s.trim()).filter(Boolean);
  if (!orParts.length) return true;
  const testPart = (part: string): boolean => {
    const p = part.trim();
    if (!p.includes("*") && !p.includes("?")) return val === p.toLowerCase();
    const re = p.replace(/[-[\]{}()|^$\\]/g, "\\$&").replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".");
    try { return new RegExp(`^${re}$`, "i").test(val); } catch { return val === p.toLowerCase(); }
  };
  return orParts.some((orPart) =>
    orPart.split("+").map((s) => s.trim()).filter(Boolean).every(testPart)
  );
}

/**
 * İstemci-only sütun filtreleri (MKT/MsMKT/MBS, OKBT): `/api/matches` ile aynı
 * `,` → OR, `+` → VE ve `< > <= >= <>` ile `a..b` / `a<->b` aralığı.
 * Karşılaştırma atomları sayısal; değilse `matchWildcard` (tam eşleşme / joker).
 */
function toFilterNum(s: string): number {
  const n = Number(String(s).trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/** Kopyala-yapış / mobil klavye: tam genişlik veya ≤≥ işaretleri `<` / `<=` olarak yorumlansın. */
function normalizeFilterAtom(atom: string): string {
  let t = atom.trim().replace(/^\uFEFF+/, "");
  if (t.startsWith("\u2264")) return "<=" + t.slice(1);
  if (t.startsWith("\u2265")) return ">=" + t.slice(1);
  if (t.startsWith("\uFF1C\uFF1D")) return "<=" + t.slice(2);
  if (t.startsWith("\uFF1E\uFF1D")) return ">=" + t.slice(2);
  if (t.startsWith("\uFF1C")) return "<" + t.slice(1);
  if (t.startsWith("\uFF1E")) return ">" + t.slice(1);
  if (t.startsWith("\uFE64")) return "<" + t.slice(1);
  if (t.startsWith("\uFE65")) return ">" + t.slice(1);
  return t;
}

function evalClientFilterAtom(cellVal: string, atom: string): boolean {
  const t = normalizeFilterAtom(atom);
  if (!t) return true;
  if (t.startsWith(">=")) {
    const r = toFilterNum(t.slice(2));
    return Number.isFinite(r) && toFilterNum(cellVal) >= r;
  }
  if (t.startsWith("<=")) {
    const r = toFilterNum(t.slice(2));
    return Number.isFinite(r) && toFilterNum(cellVal) <= r;
  }
  if (t.startsWith("<>")) {
    const rhs = t.slice(2).trim();
    const n = toFilterNum(cellVal);
    const rn = toFilterNum(rhs);
    if (Number.isFinite(n) && Number.isFinite(rn)) return n !== rn;
    return cellVal.trim() !== rhs;
  }
  if (t.startsWith(">")) {
    const r = toFilterNum(t.slice(1));
    return Number.isFinite(r) && toFilterNum(cellVal) > r;
  }
  if (t.startsWith("<")) {
    const r = toFilterNum(t.slice(1));
    return Number.isFinite(r) && toFilterNum(cellVal) < r;
  }
  const rm = t.match(/^(\d[\d.]*)\s*(?:\.\.|<->)\s*(\d[\d.]*)$/);
  if (rm) {
    const n = toFilterNum(cellVal);
    const lo = toFilterNum(rm[1]!);
    const hi = toFilterNum(rm[2]!);
    return Number.isFinite(n) && Number.isFinite(lo) && Number.isFinite(hi) && n >= lo && n <= hi;
  }
  return matchWildcard(cellVal, t);
}

function isBlankScoreCell(val: string): boolean {
  const s = val.trim();
  return s === "" || s === "-" || s === "–";
}

/** Sunucu `applyCfSkorColumnFilter` ile aynı semantik (client-only filtre satırı için). */
function evalScoreColFilter(cellVal: string, rawPattern: string): boolean {
  const raw = rawPattern.trim();
  if (raw === "_") {
    return isBlankScoreCell(cellVal);
  }
  const orParts = rawPattern.split(",").map((s) => s.trim()).filter(Boolean);
  if (!orParts.length) return true;
  return orParts.some((orPart) => {
    const andParts = orPart.split("+").map((s) => s.trim()).filter(Boolean);
    if (!andParts.length) return true;
    if (andParts.length !== 1) {
      return andParts.every((atom) => evalClientFilterAtom(cellVal, atom));
    }
    const tokenRaw = andParts[0]!;
    if (tokenRaw === "_" || tokenRaw === " _" || tokenRaw === "_ ") {
      return isBlankScoreCell(cellVal);
    }
    const { core, includeBlank } = parsePlainSkorTokenWithBlankSuffix(tokenRaw);
    const exact = core.trim().toLowerCase() === cellVal.trim().toLowerCase();
    const blankOk = includeBlank && isBlankScoreCell(cellVal);
    return exact || blankOk;
  });
}

function evalClientColFilter(cellVal: string, rawPattern: string, colId?: string): boolean {
  if (colId && SCORE_COLS.has(colId)) {
    return evalScoreColFilter(cellVal, rawPattern);
  }
  const orParts = rawPattern.split(",").map((s) => s.trim()).filter(Boolean);
  if (!orParts.length) return true;
  return orParts.some((orPart) =>
    orPart.split("+").map((s) => s.trim()).filter(Boolean).every((atom) => evalClientFilterAtom(cellVal, atom)),
  );
}


const GUN_FMT = new Intl.DateTimeFormat("tr-TR", { weekday: "long" });

/** Tabloda gösterim: gün.ay.yıl (ISO YYYY-MM-DD veya DD.MM.YYYY giriş). */
function formatTarihGünAyYıl(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^\d{2}\.\d{2}\.\d{4}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${d}.${mo}.${y}`;
  }
  return s.slice(0, 10);
}

function digitSum(val: unknown): string {
  const s = String(val ?? "").replace(/\D/g, "");
  if (!s) return "";
  return String(s.split("").reduce((acc, d) => acc + Number(d), 0));
}

/** MBS (1–3): düzleştirilmiş satır + `raw_data` üzerinden Oran alan taraması. */
function readMbsFromRow(row: Match): string {
  const top = readMbsFromOranRecord(row as unknown as Record<string, unknown>);
  if (top) return top;
  const rd = row["raw_data"];
  if (rd && typeof rd === "object" && !Array.isArray(rd)) {
    return readMbsFromOranRecord(rd as Record<string, unknown>);
  }
  return "";
}

/** Oran hücreleri: her zaman iki ondalık (1.2 → 1.20, 1 → 1.00). Sayı değilse olduğu gibi. */
function formatOddsDecimal2(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n)) return s;
  return n.toFixed(2);
}

function cellVal(row: Match, col: ColDef): string {
  // Hesaplanan (computed) sütunlar
  // MKT = maç kodu basamak toplamı (0–63); hane satırında A/B iki kutu için 2 hane sabitlenir
  if (col.id === "mbs") {
    const s = digitSum(row["id"]);
    if (!s) return "";
    const n = Number(s);
    if (!Number.isFinite(n)) return s;
    return String(Math.max(0, Math.min(99, n))).padStart(2, "0");
  }
  if (col.id === "suffix3") return digitSum(row["kod_ms"]);   // MsMKT = MS kodu basamak toplamı
  // MBS = Oran `MB` / `MBS` (1–3). `mac_suffix4` çoğunlukla son 4 maç kodu hanesi — MBS diye gösterilmez.
  if (col.id === "suffix4") {
    const mb = readMbsFromRow(row);
    if (mb) return mb;
    const colMac = String(row["mac_suffix4"] ?? "").trim();
    if (/^[1-3]$/.test(colMac)) return colMac;
    return "";
  }
  // Çok kaynaklı OKBT: {srcId}_obktb_{idx} → client-side hesap (rowKey'den)
  const multiOkbtM = /^([a-z][a-z0-9]*)_obktb_(\d{1,2})$/.exec(col.id);
  if (multiOkbtM) {
    const srcId = multiOkbtM[1]!;
    const idx = Number(multiOkbtM[2]);
    const src = OKBT_MULTI_SOURCE_MAP[srcId];
    if (src && Number.isInteger(idx) && idx >= 0) {
      if (src.id === "macid") {
        return idx < OKBT_7_IDX_COUNT ? okbt7BasamakHucreDegeri(row[src.rowKey], idx) : "";
      }
      return idx <= 14 ? okbtBasamakHucreDegeri(row[src.rowKey], idx) : "";
    }
    return "";
  }

  if (col.id === "id") {
    const rawId = row[col.key] ?? null;
    if (rawId == null || rawId === "") return "";
    const n = typeof rawId === "number" ? rawId : Number(rawId);
    if (!Number.isFinite(n)) return String(rawId);
    const s = String(Math.abs(Math.round(n)));
    return s.length <= 7 ? s.padStart(7, "0") : s;
  }

  const raw = row[col.key] ?? null;
  if (raw == null) return "";
  if (col.id === "saat") return String(raw).slice(0, 5);
  if (col.id === "tarih") return formatTarihGünAyYıl(raw);
  if (col.id === "gun") {
    const tarih = String(row["tarih"] ?? "");
    if (!tarih) return "";
    try {
      let d: Date;
      if (/^\d{2}\.\d{2}\.\d{4}/.test(tarih)) {
        const [day, mon, year] = tarih.split(".");
        d = new Date(`${year}-${mon}-${day}`);
      } else {
        d = new Date(tarih.slice(0, 10));
      }
      return isNaN(d.getTime()) ? "" : GUN_FMT.format(d);
    } catch { return ""; }
  }
  if (ODDS_GROUPS.has(col.group)) return formatOddsDecimal2(raw);
  return String(raw);
}

const ODDS_GROUPS = new Set(["Maç Sonucu","İlk Yarı","2. Yarı MS","İYMS","KG","Tek/Çift","Top.Gol","Alt/Üst","IY A/Ü","Ev A/Ü","Dep A/Ü","MS A/Ü","Çift Şans","İlk Gol","IY Skoru"]);

/** Kesin MS skoru var mı — yoksa henüz oynanmamış / sonuçlanmamış (sync-matches ile aynı kural). */
function rowHasPlayedMs(row: Match): boolean {
  const s = String(row["sonuc_ms"] ?? "").trim();
  if (s === "" || s === "-" || s === "–") return false;
  return true;
}

/** cellVal ile filtrelenen client-side sütunlar — hesaplamalı sütunlar sunucuya gönderilmez */
const CELL_VAL_CLIENT_COL_IDS_STATIC = new Set(["mbs", "suffix3", "suffix4"]);
/**
 * Bir sütun client-side mı filtrelenmeli?
 * - Statik set (mbs, MsMKT, MBS): rowKey'den computed (digitSum vb.)
 * - Tüm çoklu OKBT sütunları ({src}_obktb_{idx}):
 *     · macid 7-haneli formülle hesaplanıyor, DB fonksiyonu 5-haneli (uyuşmazlık)
 *     · Diğer kaynaklar 5-haneli ama DB fonksiyonu kurulu/güncel değilse filtre
 *       yanlış satırı döndürebiliyor.
 *   İstemci zaten doğru değeri `cellVal` ile hesaplıyor → filtre de aynı yerden
 *   yapılsın; DB durumuna bağımlılık sıfırlanır, ekrandaki değer = filtre değeri.
 */
function isCellValClientCol(id: string): boolean {
  if (CELL_VAL_CLIENT_COL_IDS_STATIC.has(id)) return true;
  if (/^[a-z][a-z0-9]*_obktb_\d+$/.test(id)) return true;
  return false;
}

/** Sütun paneli: *_obktb_{0–14} her biçim için ayrı renk (seçili / kapalı) */
function colPanelChipClass(_colId: string, on: boolean): string {
  return on
    ? "border bg-blue-600 border-blue-500 text-white"
    : "border bg-white border-gray-300 text-gray-800 hover:bg-gray-100";
}

/** `cols`: tam sütun kataloğu (örn. `mergedCols`). Yalnız `visibleCols` verilirse,
 *  gizlenmiş ama LS’te kalan *_obktb_* / client-only filtreler sessizce atlanır (<22 işlemez). */
function colFiltersRecordHasAnyTrimmed(cf: Record<string, string>): boolean {
  return Object.values(cf).some((v) => String(v ?? "").trim());
}

/** LS / birleşik state anahtarlarında uç boşluk olursa ColDef eşleşmez; değer `number` ise `.trim` patlar. */
function normalizedColFilterEntries(filters: Record<string, string>): [string, string][] {
  const out: [string, string][] = [];
  for (const [rawId, rawV] of Object.entries(filters)) {
    const id = String(rawId).trim();
    const v = String(rawV ?? "").trim();
    if (!id || !v) continue;
    out.push([id, v]);
  }
  return out;
}

/** Filtre satırı: ColDef merged’da yoksa ALL_COLS veya *_obktb_* için sentetik ColDef (cellVal yalnız id’ye bakar). */
function resolveColDefForFilter(colId: string, cols: ColDef[]): ColDef | undefined {
  const hit = cols.find((c) => c.id === colId);
  if (hit) return hit;
  const fromAll = ALL_COLS.find((c) => c.id === colId);
  if (fromAll) return fromAll;
  if (/^[a-z][a-z0-9]*_obktb_\d+$/.test(colId)) {
    return { id: colId, label: "", key: "", group: "", width: 60 };
  }
  return undefined;
}

function applyColFilters(rows: Match[], filters: Record<string, string>, cols: ColDef[]): Match[] {
  const active = normalizedColFilterEntries(filters);
  if (!active.length) return rows;
  return rows.filter((row) =>
    active.every(([colId, pat]) => {
      const col = resolveColDefForFilter(colId, cols);
      if (!col) return true;
      const val = cellVal(row, col);
      return evalClientColFilter(val, pat, colId);
    })
  );
}

/** Hane pozisyonu → A-Z harfi (tüm sütunlarda tutarlı etiket). */
const DIGIT_POS_LABEL: Record<number, string> = {
  1:"A", 2:"B", 3:"C", 4:"D", 5:"E", 6:"F", 7:"G", 8:"H", 9:"I", 10:"J",
};
const RAW_API_GROUP = "Ham veri (API)";

// ── Hane seçici (digit-position click) ───────────────────────────────────────
/** Spesifik oyun kodu / maç ID sütunları (KOD son hane vurgusu vb. için). */
const KOD_ID_COL_IDS = new Set(["id","kod_ms","kod_iy","kod_cs","kod_au"]);

const KOD_CF_IDS_SUPPRESSED_WHEN_KS_ANY = new Set(["kod_ms", "kod_iy", "kod_cs", "kod_au"]);

/**
 * `ks_any_*` (◉ / KOD son elle) açıkken API’ye gönderilmez: ham `raw_KOD*` ve tablo
 * `kod_*` sütun filtreleri ile birlikte VE uygulanınca (ör. sütunda KODIYMS=55719, panelde
 * KODAU son 5=55709) kesişim boş kalabiliyordu. Global KOD sonek seçilince bu cf’ler atlanır.
 */
function shouldSuppressCfWhenKsAny(colId: string): boolean {
  if (KOD_CF_IDS_SUPPRESSED_WHEN_KS_ANY.has(colId)) return true;
  if (colId.startsWith("raw_")) {
    const jsonKey = colId.slice(4);
    return /^kod/i.test(jsonKey);
  }
  return false;
}

/**
 * Adam'ın isteği: "isimler de hane sayılsın, neden sayılmasın" → Hane artık
 * sadece rakam değil, **ayraç olmayan her karakter** (harf dahil).
 * Ayraçlar pozisyon saymaz — ör. "20:00" için 1-4, "Süper Lig" için 1-9.
 */
const HANE_SEPARATORS = new Set([".", ":", "-", "/", ",", " ", "(", ")", "_", "'"]);
function isHaneSeparator(ch: string): boolean {
  return HANE_SEPARATORS.has(ch);
}

/**
 * Hangi sütunlarda hane kutucukları gösterilmesin?
 *  • tarih — özel gün/ay widget'ı var
 *  • dahili `__...` sütunlar (kod_suffix_active vb.)
 */
function isHaneClickCol(col: ColDef): boolean {
  if (col.id === "tarih") return false;
  if (col.id.startsWith("__")) return false;
  return true;
}

/** Geriye dönük uyumluluk — eski isim bazı yerlerde kalırsa bozulmasın. */
function isDigitClickCol(col: ColDef): boolean {
  return isHaneClickCol(col);
}

/**
 * Sütunun tipik değer şablonu: hane karakterleri `#`, ayraçlar olduğu gibi.
 * Widget bunu karaktere göre çizer: ayraç değilse tıklanabilir kutu.
 * Örn. skor → "#-#", oran → "#.##", kod → "#####", saat → "##:##"
 *
 * Metin sütunlarında sabit uzunluk yok — 6 kutu (A-F) gösteriyoruz;
 * kullanıcı soldan N karakteri sabitler, geri kalan joker olur.
 */
function digitClickTemplate(col: ColDef): string {
  if (col.id === "id") return "#######";               // 7 haneli maç kodu
  if (["kod_ms","kod_iy","kod_cs","kod_au"].includes(col.id)) return "#####"; // 5 haneli oyun kodu
  if (col.id === "sonuc_iy" || col.id === "sonuc_ms") return "#-#";           // skor: X-Y
  if (col.id === "saat") return "##:##";                // 20:00
  if (col.id === "mbs") return "##";                    // MKT: iki basamak (H / A / B)
  if (col.id === "suffix3") return "##";                // 2 haneli digit-sum
  if (col.id === "suffix4") return "#";                 // MBS: genelde tek rakam (1–3)
  // Oran grupları: "#.##"
  if (ODDS_GROUPS.has(col.group)) return "#.##";
  // OKBT multi sütunları: 2 haneli toplam
  if (/_obktb_\d+$/.test(col.id)) return "##";
  // Metin sütunları (lig adı, takımlar, gün vb.) — soldan 6 hane
  return "######";
}

/**
 * Seçili hane konumlarına göre wildcard pattern üretir.
 * Val içindeki her karakter sırayla işlenir.
 * Ayraç değil ise hane sayılır; seçili pozisyon → olduğu gibi; seçilmemiş → "?".
 * Ayraç karakterleri olduğu gibi kalır.
 *
 * Örn. "24895" + pos=[2,3] → "?48??"
 * Örn. "2.35"  + pos=[2,3] → "?.35"
 * Örn. "Süper Lig" + pos=[1,2] → "Sü??? ???"
 * Örn. "20:00" + pos=[1,2] → "20:??"
 */
type DigitPosMode = "contains" | "positional";

/**
 * mode="contains"   → baş ve son ? blokları * olur: *09* (herhangi yerde bul, ilike %09%)
 * mode="positional" → ? karakterleri olduğu gibi kalır: ?09???? (tam pozisyon eşleşmesi)
 */
function buildDigitPosPattern(val: string, positions: number[], mode: DigitPosMode = "contains"): string {
  if (!positions.length) return val;
  const posSet = new Set(positions);
  let haneIdx = 0;
  let result = "";
  for (const ch of val) {
    if (!isHaneSeparator(ch)) {
      haneIdx++;
      result += posSet.has(haneIdx) ? ch : "?";
    } else {
      result += ch;
    }
  }
  if (mode === "contains") {
    // Kenarlarda ? olmasa da (ilk/son hane seçimi) her zaman contains deseni üret: *...*
    result = result.replace(/^[?\s]+/, "*").replace(/[?\s]+$/, "*");
    if (!result.startsWith("*")) result = `*${result}`;
    if (!result.endsWith("*")) result = `${result}*`;
  }
  return result;
}

/** Oyun kodu / oran hücreleri — sonek vurgusu (son3–5 hane; kaynak kod seçilebilir). */
const KOD_SUFFIX_SKIP_COLS = new Set([
  "tarih","gun","saat",
  "lig_kodu","lig_adi","lig_id","alt_lig","alt_lig_id","sezon","sezon_id",
  "t1","t1i","t2","t2i",
  "sonuc_iy","sonuc_ms",
  "hakem","t1_antrenor","t2_antrenor",
  "mbs","suffix3","suffix4",
]);

function shouldScanColForKodSuffix(col: ColDef): boolean {
  if (col.id.startsWith("obktb_")) return false;
  if (KOD_SUFFIX_SKIP_COLS.has(col.id)) return false;
  if (ODDS_GROUPS.has(col.group)) return true;
  if (col.id === "id" || col.id === "kod_ms" || col.id === "kod_cs" || col.id === "kod_iy" || col.id === "kod_au") return true;
  if (col.group === RAW_API_GROUP) return true;
  return false;
}

/** Rakamlar üzerinden son N hane eşlemesi (5 haneli oyun kodu veya maç id). */
function cellDigitsEndWith(val: string, suffix: string): boolean {
  const d = val.replace(/\D/g, "");
  return d.length >= suffix.length && d.endsWith(suffix);
}

/** Son N rakam (ör. 3–5); yeterli rakam yoksa null. */
function normalizeKodSuffixDigits(raw: string, n: number): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length < n) return null;
  return d.slice(-n);
}

function rowKodSuffix(row: Match, refKey: string, n: number): string | null {
  return normalizeKodSuffixDigits(String(row[refKey] ?? ""), n);
}

/** Tamamlanmış bir maçta hangi hücre "tuttu" → green (MS bazlı) | orange (IY bazlı) | null */
function computeMatchHit(col: ColDef, row: Match): "green" | "orange" | null {
  // sonuc_ms "2-1" gibi skor formatında geliyor; maç bitmemişse null
  const sonucMs = String(row["sonuc_ms"] ?? "").trim();
  const sonucIy = String(row["sonuc_iy"] ?? "").trim();
  if (!sonucMs) return null; // maç bitmemiş

  const ft1 = row["ft1"] !== null && row["ft1"] !== undefined ? Number(row["ft1"]) : NaN;
  const ft2 = row["ft2"] !== null && row["ft2"] !== undefined ? Number(row["ft2"]) : NaN;
  const ht1 = row["ht1"] !== null && row["ht1"] !== undefined ? Number(row["ht1"]) : NaN;
  const ht2 = row["ht2"] !== null && row["ht2"] !== undefined ? Number(row["ht2"]) : NaN;
  const hasFt = !isNaN(ft1) && !isNaN(ft2);
  const hasHt = !!sonucIy && !isNaN(ht1) && !isNaN(ht2);
  const tg = hasFt ? ft1 + ft2 : NaN;   // toplam gol
  const iyg = hasHt ? ht1 + ht2 : NaN;  // IY toplam gol

  // ft1/ft2'den MS sonucunu türet ("1"/"X"/"2")
  const ms = hasFt ? (ft1 > ft2 ? "1" : ft1 === ft2 ? "X" : "2") : "";
  // ht1/ht2'den IY sonucunu türet; yoksa doğrudan "1"/"X"/"2" formatındaysa kullan
  const iy = hasHt
    ? (ht1 > ht2 ? "1" : ht1 === ht2 ? "X" : "2")
    : (["1","X","2"].includes(sonucIy) ? sonucIy : "");

  switch (col.id) {
    // ── Maç Sonucu ─────────────────────────────────────────────────────────────
    case "ms1": return ms === "1" ? "green" : null;
    case "msx": return ms === "X" ? "green" : null;
    case "ms2": return ms === "2" ? "green" : null;

    // ── OKBT (IY sonucu) ───────────────────────────────────────────────────────
    case "iy1": return iy === "1" ? "orange" : null;
    case "iyx": return iy === "X" ? "orange" : null;
    case "iy2": return iy === "2" ? "orange" : null;

    // ── İYMS (İY / MS kombinasyonu) ───────────────────────────────────────────
    case "iyms11": return iy === "1" && ms === "1" ? "green" : null;
    case "iyms1x": return iy === "1" && ms === "X" ? "green" : null;
    case "iyms12": return iy === "1" && ms === "2" ? "green" : null;
    case "iymsx1": return iy === "X" && ms === "1" ? "green" : null;
    case "iymsxx": return iy === "X" && ms === "X" ? "green" : null;
    case "iymsx2": return iy === "X" && ms === "2" ? "green" : null;
    case "iyms21": return iy === "2" && ms === "1" ? "green" : null;
    case "iyms2x": return iy === "2" && ms === "X" ? "green" : null;
    case "iyms22": return iy === "2" && ms === "2" ? "green" : null;

    // ── KG ────────────────────────────────────────────────────────────────────
    case "kg_var": return hasFt && ft1 > 0 && ft2 > 0 ? "green" : null;
    case "kg_yok": return hasFt && !(ft1 > 0 && ft2 > 0) ? "green" : null;

    // ── Tek/Çift ──────────────────────────────────────────────────────────────
    case "cift": return hasFt && tg % 2 === 0 ? "green" : null;
    case "tek":  return hasFt && tg % 2 !== 0 ? "green" : null;

    // ── Top.Gol ───────────────────────────────────────────────────────────────
    case "tg01": return hasFt && tg <= 1 ? "green" : null;
    case "tg23": return hasFt && tg >= 2 && tg <= 3 ? "green" : null;
    case "tg45": return hasFt && tg >= 4 && tg <= 5 ? "green" : null;
    case "tg6":  return hasFt && tg >= 6 ? "green" : null;

    // ── Alt/Üst (maç) ─────────────────────────────────────────────────────────
    case "a05": return hasFt && tg < 0.5 ? "green" : null;
    case "u05": return hasFt && tg >= 0.5 ? "green" : null;
    case "a15": return hasFt && tg < 1.5 ? "green" : null;
    case "u15": return hasFt && tg >= 1.5 ? "green" : null;
    case "a25": return hasFt && tg < 2.5 ? "green" : null;
    case "u25": return hasFt && tg >= 2.5 ? "green" : null;
    case "a35": return hasFt && tg < 3.5 ? "green" : null;
    case "u35": return hasFt && tg >= 3.5 ? "green" : null;
    case "a45": return hasFt && tg < 4.5 ? "green" : null;
    case "u45": return hasFt && tg >= 4.5 ? "green" : null;
    case "a55": return hasFt && tg < 5.5 ? "green" : null;
    case "u55": return hasFt && tg >= 5.5 ? "green" : null;

    // ── IY Alt/Üst ────────────────────────────────────────────────────────────
    case "iya05": return hasHt && iyg < 0.5 ? "orange" : null;
    case "iyu05": return hasHt && iyg >= 0.5 ? "orange" : null;
    case "iya15": return hasHt && iyg < 1.5 ? "orange" : null;
    case "iyu15": return hasHt && iyg >= 1.5 ? "orange" : null;
    case "iya25": return hasHt && iyg < 2.5 ? "orange" : null;
    case "iyu25": return hasHt && iyg >= 2.5 ? "orange" : null;

    // ── Ev A/Ü ────────────────────────────────────────────────────────────────
    case "eaua05": return hasFt && ft1 < 0.5 ? "green" : null;
    case "eauu05": return hasFt && ft1 >= 0.5 ? "green" : null;
    case "eaua15": return hasFt && ft1 < 1.5 ? "green" : null;
    case "eauu15": return hasFt && ft1 >= 1.5 ? "green" : null;
    case "eaua25": return hasFt && ft1 < 2.5 ? "green" : null;
    case "eauu25": return hasFt && ft1 >= 2.5 ? "green" : null;

    // ── Dep A/Ü ───────────────────────────────────────────────────────────────
    case "daua05": return hasFt && ft2 < 0.5 ? "green" : null;
    case "dauu05": return hasFt && ft2 >= 0.5 ? "green" : null;
    case "daua15": return hasFt && ft2 < 1.5 ? "green" : null;
    case "dauu15": return hasFt && ft2 >= 1.5 ? "green" : null;
    case "daua25": return hasFt && ft2 < 2.5 ? "green" : null;
    case "dauu25": return hasFt && ft2 >= 2.5 ? "green" : null;

    // ── Çift Şans ─────────────────────────────────────────────────────────────
    case "ms_cs1x": return ms === "1" || ms === "X" ? "green" : null;
    case "ms_cs12": return ms === "1" || ms === "2" ? "green" : null;
    case "ms_csx2": return ms === "X" || ms === "2" ? "green" : null;
    case "iy_cs1":  return iy === "1" || iy === "X" ? "orange" : null;
    case "iy_csx":  return iy === "X" || iy === "2" ? "orange" : null;
    case "iy_cs2":  return iy === "1" || iy === "2" ? "orange" : null;

    // ── MS A/Ü ────────────────────────────────────────────────────────────────
    case "msau15_1a": return hasFt && ms === "1" && tg < 1.5 ? "green" : null;
    case "msau15_1u": return hasFt && ms === "1" && tg >= 1.5 ? "green" : null;
    case "msau15_xa": return hasFt && ms === "X" && tg < 1.5 ? "green" : null;
    case "msau15_xu": return hasFt && ms === "X" && tg >= 1.5 ? "green" : null;
    case "msau15_2a": return hasFt && ms === "2" && tg < 1.5 ? "green" : null;
    case "msau15_2u": return hasFt && ms === "2" && tg >= 1.5 ? "green" : null;
    case "msau25_1a": return hasFt && ms === "1" && tg < 2.5 ? "green" : null;
    case "msau25_1u": return hasFt && ms === "1" && tg >= 2.5 ? "green" : null;
    case "msau25_xa": return hasFt && ms === "X" && tg < 2.5 ? "green" : null;
    case "msau25_xu": return hasFt && ms === "X" && tg >= 2.5 ? "green" : null;
    case "msau25_2a": return hasFt && ms === "2" && tg < 2.5 ? "green" : null;
    case "msau25_2u": return hasFt && ms === "2" && tg >= 2.5 ? "green" : null;
    case "msau35_1a": return hasFt && ms === "1" && tg < 3.5 ? "green" : null;
    case "msau35_1u": return hasFt && ms === "1" && tg >= 3.5 ? "green" : null;
    case "msau35_xa": return hasFt && ms === "X" && tg < 3.5 ? "green" : null;
    case "msau35_xu": return hasFt && ms === "X" && tg >= 3.5 ? "green" : null;
    case "msau35_2a": return hasFt && ms === "2" && tg < 3.5 ? "green" : null;
    case "msau35_2u": return hasFt && ms === "2" && tg >= 3.5 ? "green" : null;
    case "msau45_1a": return hasFt && ms === "1" && tg < 4.5 ? "green" : null;
    case "msau45_1u": return hasFt && ms === "1" && tg >= 4.5 ? "green" : null;
    case "msau45_xa": return hasFt && ms === "X" && tg < 4.5 ? "green" : null;
    case "msau45_xu": return hasFt && ms === "X" && tg >= 4.5 ? "green" : null;
    case "msau45_2a": return hasFt && ms === "2" && tg < 4.5 ? "green" : null;
    case "msau45_2u": return hasFt && ms === "2" && tg >= 4.5 ? "green" : null;

    // ── 2. yarı MS (1X2) — IKIYS1 / IKIYSX / IKIYS2 ───────────────────────────
    case "ikiys1": {
      if (!hasFt || !hasHt) return null;
      const sh1 = ft1 - ht1;
      const sh2 = ft2 - ht2;
      return sh1 > sh2 ? "orange" : null;
    }
    case "ikiysx": {
      if (!hasFt || !hasHt) return null;
      const sh1 = ft1 - ht1;
      const sh2 = ft2 - ht2;
      return sh1 === sh2 ? "orange" : null;
    }
    case "ikiys2": {
      if (!hasFt || !hasHt) return null;
      const sh1 = ft1 - ht1;
      const sh2 = ft2 - ht2;
      return sh2 > sh1 ? "orange" : null;
    }

    // ── IY Skoru ──────────────────────────────────────────────────────────────
    case "h1ys_00": return hasHt && ht1 === 0 && ht2 === 0 ? "orange" : null;
    case "h1ys_01": return hasHt && ht1 === 0 && ht2 === 1 ? "orange" : null;
    case "h1ys_10": return hasHt && ht1 === 1 && ht2 === 0 ? "orange" : null;
    case "h1ys_11": return hasHt && ht1 === 1 && ht2 === 1 ? "orange" : null;
    case "h1ys_12": return hasHt && ht1 === 1 && ht2 === 2 ? "orange" : null;
    case "h1ys_20": return hasHt && ht1 === 2 && ht2 === 0 ? "orange" : null;
    case "h1ys_21": return hasHt && ht1 === 2 && ht2 === 1 ? "orange" : null;
    case "h1ys_22": return hasHt && ht1 === 2 && ht2 === 2 ? "orange" : null;
    case "h1ys_dg": {
      if (!hasHt) return null;
      const known = [[0,0],[0,1],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]];
      return !known.some(([h,a]) => ht1 === h && ht2 === a) ? "orange" : null;
    }

    default:
      return null;
  }
}

const HIT_COLORS = [
  "bg-green-500/30 text-green-900",
  "bg-orange-500/30 text-orange-900",
] as const;

/** Sütun başlıklarının üstündeki yapışkan grup satırı (colSpan). */
function buildGroupSpans(cols: ColDef[]) {
  const spans: { group: string; count: number }[] = [];
  for (const c of cols) {
    if (spans.length && spans[spans.length - 1].group === c.group) spans[spans.length - 1].count++;
    else spans.push({ group: c.group, count: 1 });
  }
  return spans;
}

/** Görünür sütun sırası: prevOrder + görünürde olup listede olmayanlar (merged sırasıyla sonda). */
function orderedVisibleCols(mergedCols: ColDef[], visibleIds: Set<string>, prevOrder: string[]): ColDef[] {
  const visible = mergedCols.filter((c) => visibleIds.has(c.id));
  const visSet = new Set(visible.map((c) => c.id));
  const out: ColDef[] = [];
  const used = new Set<string>();
  for (const id of prevOrder) {
    if (!visSet.has(id)) continue;
    const col = mergedCols.find((c) => c.id === id);
    if (col) {
      out.push(col);
      used.add(id);
    }
  }
  for (const c of visible) {
    if (!used.has(c.id)) out.push(c);
  }
  return out;
}

function reorderColOrder(
  mergedCols: ColDef[],
  visibleIds: Set<string>,
  prevOrder: string[],
  fromId: string,
  toId: string,
): string[] {
  const orderedIds = orderedVisibleCols(mergedCols, visibleIds, prevOrder).map((c) => c.id);
  const fi = orderedIds.indexOf(fromId);
  const ti = orderedIds.indexOf(toId);
  if (fi < 0 || ti < 0 || fi === ti) return prevOrder;
  const next = [...orderedIds];
  const [moved] = next.splice(fi, 1);
  next.splice(ti, 0, moved);
  return next;
}

const COL_W_MIN = 40;
const COL_W_MAX = 900;

// ── localStorage ──────────────────────────────────────────────────────────────
const LS_VISIBLE  = "om_visible_cols";
const LS_COL_FILT = "om_col_filters";
const LS_TOP_FILT = "om_top_filters";
const LS_PRESETS  = "om_col_presets";
const LS_COL_CLICK_POS = "om_col_click_pos";
const LS_COL_ORDER = "om_col_order";
const LS_COL_WIDTHS = "om_col_widths";
const LS_SHOW_DIGIT_ROW  = "om_show_digit_row";
const LS_DIGIT_POS_MODE  = "om_digit_pos_mode";
const LS_COL_DIGIT_MODE  = "om_col_digit_mode"; // per-column H/A override (Record<colId, mode>)
const LS_SCORE_RECENT    = "om_score_recent";
const LS_VIEW_PRESETS = "om_view_presets";

type KodSuffixN = 3 | 4 | 5;
type KodSuffixRefKey = "id" | "kod_ms" | "kod_iy" | "kod_cs" | "kod_au";

/** Üst «Kod» satırı kaldırıldı; satır bazlı sarı sonek vurgusu için sabit kaynak. */
const DEFAULT_KOD_ROW_SUFFIX_N: KodSuffixN = 4;
const DEFAULT_KOD_ROW_SUFFIX_REF: KodSuffixRefKey = "id";

/** ◉ Son hane paneli özel N; `route.ts` içindeki `KS_N_OK` ile aynı aralıkta tutulmalı. */
const KS_PANEL_CODE_PICK_N_MIN = 3;
const KS_PANEL_CODE_PICK_N_MAX = 5;
const KS_PANEL_CODE_PICK_BASE_NS = [3, 4, 5] as const;

function lsGet<T>(key: string, fb: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as T : fb; }
  catch { return fb; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
}

// ── preset (sadece sütun seçimi kaydeder) ─────────────────────────────────────
interface ColPreset { name: string; ids: string[]; }

/** Tam görünüm kaydı: sütun seçimi + filtreler + sıralama + düzen */
interface ViewPreset {
  name: string;
  createdAt: string;
  // sütunlar
  visibleIds: string[];
  colOrder: string[];
  colWidths: Record<string, number>;
  colClickPos: Record<string, number[]>;
  // filtreler
  topFilters: Record<string, string>;
  colFilters: Record<string, string>;
  bidirFilters?: BidirFiltersState;
  // sıralama
  sortCol: string | null;
  sortDir: "asc" | "desc";
  // kod sonek
  kodSon4: string;
  kodSuffixN: number;
  kodSuffixRefKey: string;
}

const EMPTY_TOP = {
  tarih_from: "",
  tarih_to: "",
  tarih_gun: "",
  tarih_ay: "",
  tarih_yil: "",
  lig: "",
  takim: "",
  sonuc_iy: "",
  sonuc_ms: "",
  hakem: "",
  suffix4: "",
  suffix3: "",
};

type TopFilterKey = keyof typeof EMPTY_TOP;

/**
 * cf_* sütun filtresi silinince aynı anlamı taşıyan üst şerit `applied`/`filters` alanı da boşalsın.
 * Örn. «Maça göre doldur» yalnızca `applied.lig` doldurur; sütun `lig_adi` kutusu boş olsa API `lig=` ile kalır.
 */
const CF_COLUMN_ID_TO_TOP_FILTER_KEY: Partial<Record<string, TopFilterKey>> = {
  lig_adi: "lig",
  hakem: "hakem",
  sonuc_iy: "sonuc_iy",
  sonuc_ms: "sonuc_ms",
};

/** Tarih sütunu altı: gün / ay — API `tarih_gun` / `tarih_ay` (tarih_arama; yıl seçici yok). */
const TARIH_PICK_GUN = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const TARIH_PICK_AY = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

// ── Çift Yönlü (⇄) Arama ─────────────────────────────────────────────────────
/** Eski localStorage / preset: tek kutu + mode */
type BidirPersonelMode = "hakem" | "ant" | "all";

/** Ev / dep ayrı: ikisi doluysa VE (Barcelona ev + Real dep). Yalnız ev veya yalnız dep da mümkün. */
interface BidirTeamPairState {
  ev:  { pattern: string; committed: string };
  dep: { pattern: string; committed: string };
}

/** Hakem; ev TD; dep TD; ev+dep TD (OR, bidir_ant) — dolu olanlar VE ile birleşir. */
interface BidirPersonelLanesState {
  hakem: { pattern: string; committed: string };
  antEv: { pattern: string; committed: string };
  antDep: { pattern: string; committed: string };
  /** Ev veya dep TD’de eşleşme (t1_antrenor | t2_antrenor OR). */
  antHer: { pattern: string; committed: string };
}

interface BidirFiltersState {
  takim:    BidirTeamPairState;
  takimid:  BidirTeamPairState;
  personel: BidirPersonelLanesState;
}

const BIDIR_INIT: BidirFiltersState = {
  takim:    { ev: { pattern: "", committed: "" }, dep: { pattern: "", committed: "" } },
  takimid:  { ev: { pattern: "", committed: "" }, dep: { pattern: "", committed: "" } },
  personel: {
    hakem: { pattern: "", committed: "" },
    antEv: { pattern: "", committed: "" },
    antDep: { pattern: "", committed: "" },
    antHer: { pattern: "", committed: "" },
  },
};

const LS_BIDIR        = "bidir_filters_v1";
const LS_SHOW_BIDIR   = "show_bidir_row_v1";

type BidirTakimModeV1 = "ev" | "dep" | "ikisi";

function migrateBidirV1ToTeamPair(o: {
  pattern: string;
  committed: string;
  mode: BidirTakimModeV1;
}): BidirTeamPairState {
  if (o.mode === "ev") return { ev: { pattern: o.pattern, committed: o.committed }, dep: { pattern: "", committed: "" } };
  if (o.mode === "dep") return { ev: { pattern: "", committed: "" }, dep: { pattern: o.pattern, committed: o.committed } };
  return { ev: { pattern: o.pattern, committed: o.committed }, dep: { pattern: "", committed: "" } };
}

function migratePersonelV1(o: {
  pattern: string;
  committed: string;
  mode: BidirPersonelMode;
}): BidirPersonelLanesState {
  const z = { pattern: "", committed: "" };
  if (o.mode === "hakem") {
    return { hakem: { pattern: o.pattern, committed: o.committed }, antEv: { ...z }, antDep: { ...z }, antHer: { ...z } };
  }
  if (o.mode === "ant") {
    return { hakem: { ...z }, antEv: { ...z }, antDep: { ...z }, antHer: { pattern: o.pattern, committed: o.committed } };
  }
  // Eski "tüm personel" (tek OR): yalnızca hakem kutusuna taşınır; gerekirse kullanıcı yeniden ayırır.
  return { hakem: { pattern: o.pattern, committed: o.committed }, antEv: { ...z }, antDep: { ...z }, antHer: { ...z } };
}

function isPersonelLane(x: unknown): x is { pattern: string; committed: string } {
  return (
    !!x &&
    typeof x === "object" &&
    "pattern" in (x as object) &&
    "committed" in (x as object)
  );
}

function normalizePersonelLanes(raw: unknown): BidirPersonelLanesState {
  if (!raw || typeof raw !== "object") return BIDIR_INIT.personel;
  const o = raw as Record<string, unknown>;
  const hk = o.hakem;
  const antEv = o.antEv;
  const antDep = o.antDep;
  const antHerRaw = o.antHer;
  const legacyAnt = o.ant;
  if (isPersonelLane(hk) && isPersonelLane(antEv) && isPersonelLane(antDep)) {
    const antHer = isPersonelLane(antHerRaw) ? antHerRaw : { pattern: "", committed: "" };
    return { hakem: hk, antEv, antDep, antHer };
  }
  if (isPersonelLane(hk) && isPersonelLane(legacyAnt)) {
    return {
      hakem: hk,
      antEv: { pattern: "", committed: "" },
      antDep: { pattern: "", committed: "" },
      antHer: legacyAnt,
    };
  }
  if ("mode" in o && typeof o.mode === "string") {
    return migratePersonelV1(o as { pattern: string; committed: string; mode: BidirPersonelMode });
  }
  return BIDIR_INIT.personel;
}

/** Kayıtlı görünüm (eski preset) veya harici JSON: v1 { mode } → ev/dep çifti. */
function normalizeBidirFromUnknown(raw: unknown): BidirFiltersState {
  if (!raw || typeof raw !== "object") return BIDIR_INIT;
  const p = raw as Record<string, unknown>;
  const tak = p.takim;
  if (tak && typeof tak === "object" && "ev" in tak && "dep" in tak) {
    const b = raw as Partial<BidirFiltersState>;
    return {
      takim: b.takim ?? BIDIR_INIT.takim,
      takimid: b.takimid ?? BIDIR_INIT.takimid,
      personel: normalizePersonelLanes(b.personel),
    };
  }
  if (
    tak &&
    typeof tak === "object" &&
    "mode" in tak &&
    p.takimid &&
    typeof p.takimid === "object" &&
    "mode" in (p.takimid as object)
  ) {
    const v1 = raw as {
      takim: { pattern: string; committed: string; mode: BidirTakimModeV1 };
      takimid: { pattern: string; committed: string; mode: BidirTakimModeV1 };
      personel?: unknown;
    };
    return {
      takim: migrateBidirV1ToTeamPair(v1.takim),
      takimid: migrateBidirV1ToTeamPair(v1.takimid),
      personel: normalizePersonelLanes(v1.personel),
    };
  }
  return BIDIR_INIT;
}

function readBidirFiltersFromStorage(): BidirFiltersState {
  try {
    const raw = localStorage.getItem(LS_BIDIR);
    if (!raw) return BIDIR_INIT;
    return normalizeBidirFromUnknown(JSON.parse(raw) as unknown);
  } catch {
    return BIDIR_INIT;
  }
}

// ── Referans Maç ─────────────────────────────────────────────────────────────
/** Referans maçtan hangi alan kullanılacak */
type RefMatchField = "t1i" | "t2i" | "id" | "kod_ms" | "kod_iy";

const REF_MATCH_FIELDS: { key: RefMatchField; label: string; title: string }[] = [
  { key: "t1i",    label: "T1-ID",  title: "Ev Takım ID" },
  { key: "t2i",    label: "T2-ID",  title: "Dep Takım ID" },
  { key: "id",     label: "Maç ID", title: "Maç Kodu" },
  { key: "kod_ms", label: "MS Kod", title: "MS Oyun Kodu" },
  { key: "kod_iy", label: "İY Kod", title: "İY Oyun Kodu" },
];

interface RefMatchState {
  query: string;
  results: Match[];
  selected: Match | null;
  isOpen: boolean;
  loading: boolean;
  field: RefMatchField;
  positions: number[]; // seçili hane pozisyonları (1-tabanlı); boş = tam değer
}

const REF_MATCH_INIT: RefMatchState = {
  query: "", results: [], selected: null, isOpen: false, loading: false,
  field: "t1i", positions: [],
};

/** Takım Ev / Dep kutuları: yazdıkça benzersiz takım adı listesi (/api/team-suggest). */
interface TakimSuggestLaneState {
  open: boolean;
  loading: boolean;
  teamNames: string[];
}
const TAKIM_SUGGEST_INIT: TakimSuggestLaneState = { open: false, loading: false, teamNames: [] };

/** Seçilen maçtan + pozisyonlardan wildcard pattern üret */
function buildRefPattern(match: Match, field: RefMatchField, positions: number[], mode: DigitPosMode = "contains"): string {
  const raw = String(match[field] ?? "").replace(/\D/g, "");
  if (!raw) return "";
  if (!positions.length) return raw;
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    out += positions.includes(i + 1) ? raw[i] : "?";
  }
  if (mode === "contains") {
    out = out.replace(/^\?+/, "*").replace(/\?+$/, "*");
  } else {
    out = out.replace(/^\?+/, "*"); // sadece baştaki ? → * (prefix her zaman)
  }
  return out;
}

/** Ref maç alanından → doğru filtreye yönlendir */
const REF_FIELD_TO_COL_ID: Partial<Record<RefMatchField, string>> = {
  id:     "id",
  kod_ms: "kod_ms",
  kod_iy: "kod_iy",
};

export default function MatchTable() {
  const [matches, setMatches]     = useState<Match[]>([]);
  const [loading, setLoading]     = useState(false);
  /** overflow:auto içinde absolute örtü yarım kalabiliyor; body’de fixed + rect ile tam kapat */
  const tableScrollAreaRef = useRef<HTMLDivElement>(null);
  const [tableLoadGuardRect, setTableLoadGuardRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  /** API 500/503 vb.; boş tablo ile karışmasın diye ayrı gösterilir */
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [balance, setBalance]      = useState<string | null>(null);
  const [rawKeyUnion, setRawKeyUnion] = useState<string[]>([]);

  // Balance: sayfa açılışında + her 2 dakikada bir güncelle
  useEffect(() => {
    const fetchBalance = () =>
      fetch("/api/balance")
        .then((r) => r.json())
        .then((j: { balance?: string | number }) => {
          if (j.balance != null) setBalance(String(j.balance));
        })
        .catch(() => {});
    fetchBalance();
    const id = setInterval(fetchBalance, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/matches/raw-keys")
      .then((r) => r.json())
      .then((j: { keys?: string[] }) => {
        setRawKeyUnion(Array.isArray(j.keys) ? j.keys : []);
      })
      .catch(() => setRawKeyUnion([]));
  }, []);

  const mergedCols = useMemo(() => mergeAllCols(rawKeyUnion), [rawKeyUnion]);

  // sütun görünürlük
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => {
    const s = lsGet<string[]>(LS_VISIBLE, []);
    return s.length ? new Set(s) : new Set(DEFAULT_VISIBLE);
  });
  const [showColPanel, setShowColPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  /** Ardışık fetch’lerde yalnızca son yanıtın state yazması için. */
  const matchesFetchGenRef = useRef(0);

  // sütun presetleri
  const [colPresets, setColPresets] = useState<ColPreset[]>(() => lsGet<ColPreset[]>(LS_PRESETS, []));
  const [presetInput, setPresetInput] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  // üst filtreler
  const [filters, setFilters] = useState(() => ({ ...EMPTY_TOP, ...lsGet<typeof EMPTY_TOP>(LS_TOP_FILT, EMPTY_TOP) }));
  const [applied, setApplied] = useState(() => ({ ...EMPTY_TOP, ...lsGet<typeof EMPTY_TOP>(LS_TOP_FILT, EMPTY_TOP) }));

  // sütun bazlı filtreler — display (her tuşta) vs committed (Enter ile)
  const [colFilters, setColFilters] = useState<Record<string,string>>(() => lsGet<Record<string,string>>(LS_COL_FILT, {}));
  const [colFiltersCommitted, setColFiltersCommitted] = useState<Record<string,string>>(() => lsGet<Record<string,string>>(LS_COL_FILT, {}));

  // Son hane filtresi paneli (çift-tık)
  const [codePick, setCodePick] = useState<CodePickPanel>(null);
  // Çift-tık ile seçilen son-hane vurgusu (filtrelemez, sadece sarı)
  /** Panel / KOD son elle: raw_data KOD* alanlarında son N hane eşleşen maçları gösterir */
  const [anyKodSuffix, setAnyKodSuffix] = useState<AnyKodSuffixState | null>(null);
  /** Sayfalama şeridi: satırdan bağımsız KOD* son N filtre girişi. */
  const [manualKsN, setManualKsN] = useState("3");
  const [manualKsDigits, setManualKsDigits] = useState("");

  const kodSuffixN = DEFAULT_KOD_ROW_SUFFIX_N;
  const kodSuffixRefKey = DEFAULT_KOD_ROW_SUFFIX_REF;

  function commitColFilters(next: Record<string,string>) {
    setColFiltersCommitted(next);
    lsSet(LS_COL_FILT, next);
    setPage(1);
  }

  /** Sütun cf_* temizlenince üst şeritteki aynı anlamlı alanı da sil (ör. `lig` ↔ lig_adi). */
  function clearMirroredTopFilterForCfColumn(colId: string) {
    const topKey = CF_COLUMN_ID_TO_TOP_FILTER_KEY[colId];
    if (!topKey) return;
    setFilters((f) => ({ ...f, [topKey]: "" }));
    setApplied((a) => ({ ...a, [topKey]: "" }));
  }

  // Yazarken otomatik ara — 400ms debounce (Enter beklenmez)
  useEffect(() => {
    const t = setTimeout(() => commitColFilters(colFilters), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colFilters]);

  const [tarihPick, setTarihPick] = useState(() => {
    const top = lsGet<typeof EMPTY_TOP>(LS_TOP_FILT, EMPTY_TOP);
    return {
      d: top.tarih_gun?.trim() ?? "",
      m: top.tarih_ay?.trim() ?? "",
    };
  });

  useEffect(() => {
    setTarihPick({
      d: applied.tarih_gun?.trim() ?? "",
      m: applied.tarih_ay?.trim() ?? "",
    });
  }, [applied.tarih_gun, applied.tarih_ay]);

  function handleTarihPickChange(part: "d" | "m", value: string) {
    const next = { ...tarihPick, [part]: value };
    setTarihPick(next);
    setFilters((f) => ({
      ...f,
      tarih_gun: next.d,
      tarih_ay: next.m,
      tarih_yil: "",
      tarih_from: "",
      tarih_to: "",
    }));
    setApplied((a) => ({
      ...a,
      tarih_gun: next.d,
      tarih_ay: next.m,
      tarih_yil: "",
      tarih_from: "",
      tarih_to: "",
    }));
    setColFilters((cf) => {
      const n = { ...cf, tarih: "" };
      commitColFilters(n);
      return n;
    });
  }

  function renderTarihGunAyPick() {
    return (
      <div
        className="flex items-center gap-0.5 flex-wrap justify-center w-full"
        title="Gün ve ay (VE) ile tarih_arama süzümü. Metin cf_tarih ile aynı anda kullanmayın. Yalnız ⊞ Hane açıkken burada görünür.">
        <select
          value={tarihPick.d}
          onChange={(e) => handleTarihPickChange("d", e.target.value)}
          className="tarih-select-mobile max-w-[2.75rem] bg-white border border-gray-500 rounded px-0.5 py-px text-[11px] text-gray-900 focus:outline-none focus:border-blue-500 touch-manipulation">
          <option value="">Gün</option>
          {TARIH_PICK_GUN.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          value={tarihPick.m}
          onChange={(e) => handleTarihPickChange("m", e.target.value)}
          className="tarih-select-mobile max-w-[2.75rem] bg-white border border-gray-500 rounded px-0.5 py-px text-[11px] text-gray-900 focus:outline-none focus:border-blue-500 touch-manipulation">
          <option value="">Ay</option>
          {TARIH_PICK_AY.map((ay) => (
            <option key={ay} value={ay}>{ay}</option>
          ))}
        </select>
      </div>
    );
  }

  // sütun sırası ve genişlikleri (Excel benzeri)
  const [colOrder, setColOrder] = useState<string[]>(() => lsGet<string[]>(LS_COL_ORDER, []));
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => lsGet<Record<string, number>>(LS_COL_WIDTHS, {}));
  const resizeRef = useRef<{ id: string; startX: number; startW: number } | null>(null);

  // hane seçici (digit-position click): hangi sütunda hangi hane pozisyonları seçili?
  // Boş dizi = H (tam değer), [1,3] = 1. ve 3. rakamlar sabit, geri kalanlar joker
  const [colClickPos, setColClickPos] = useState<Record<string, number[]>>(
    () => lsGet<Record<string, number[]>>(LS_COL_CLICK_POS, {})
  );
  // hane seçici satırı görünür mü?
  const [showDigitRow, setShowDigitRow] = useState<boolean>(
    () => lsGet<boolean>(LS_SHOW_DIGIT_ROW, false)
  );
  // hane seçici modu: "contains" = *09* (herhangi yerde), "positional" = ?09???? (tam pozisyon)
  const [digitPosMode, setDigitPosMode] = useState<DigitPosMode>(
    () => lsGet<DigitPosMode>(LS_DIGIT_POS_MODE, "contains")
  );
  /**
   * Sütun başına H/A override. Boş ise global `digitPosMode` kullanılır.
   * Adam: "tek toggle yerine istediğimde yerinde istediğimde karışık seçebilirsem".
   */
  const [colDigitMode, setColDigitMode] = useState<Record<string, DigitPosMode>>(
    () => lsGet<Record<string, DigitPosMode>>(LS_COL_DIGIT_MODE, {})
  );
  /** Verilen sütun için efektif hane modu (override varsa o, yoksa global). */
  const effectiveDigitMode = useCallback(
    (colId: string): DigitPosMode => colDigitMode[colId] ?? digitPosMode,
    [colDigitMode, digitPosMode],
  );

  // ⚽ Skor Kutusu
  const [showScoreBox, setShowScoreBox] = useState(false);
  const [scoreIy, setScoreIy] = useState<string>("");
  const [scoreMs, setScoreMs] = useState<string>("");
  const [scoreRecent, setScoreRecent] = useState<{ iy: string; ms: string }[]>(
    () => lsGet<{ iy: string; ms: string }[]>(LS_SCORE_RECENT, [])
  );
  const scoreBoxRef = useRef<HTMLDivElement>(null);

  // 🎯 Eşleştirme Paneli
  const [showEslestirme, setShowEslestirme] = useState(false);
  /** Eşleştirme panelinden uygulanan aktif etiket (örn. "Tekrar 48") — temizle butonunda görünür */
  const [eslestirmeLabel, setEslestirmeLabel] = useState<string | null>(null);

  // 💾 Filtrelerim (server-side, user-specific)
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  /** Çekmece kaydı uygulanınca dolar — oynanmamış maç seçici şeridi */
  const [loadedSavedFilterName, setLoadedSavedFilterName] = useState<string | null>(null);
  /** Kayıtlı filtreye ek olarak tek maça odak (cf_id); picker listesi buna göre daralmaz */
  const [focusMatchId, setFocusMatchId] = useState<string | null>(null);
  const [pickerRows, setPickerRows] = useState<PickerMatchRow[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  /** null = henüz maç seçilmedi (— Maç seç —); böylece ilk maça tıklanınca da onChange çalışır. */
  const [pickerSelectedIndex, setPickerSelectedIndex] = useState<number | null>(null);
  const [pickerPartial, setPickerPartial] = useState(false);
  /** Liste maçı seçilince tarih / saat / üst lig kutularına yaz (OM tarzı referans) */
  const [refAutoFillFromPicker, setRefAutoFillFromPicker] = useState(true);

  // 🔍 Tarama Modu — sıra sıra maç inceleme
  const [showTarama, setShowTarama] = useState(false);

  // çift yönlü arama
  const [bidirFilters, setBidirFilters] = useState<BidirFiltersState>(readBidirFiltersFromStorage);
  const [showBidirRow, setShowBidirRow] = useState<boolean>(
    () => lsGet<boolean>(LS_SHOW_BIDIR, false)
  );
  // referans maç
  const [refMatch, setRefMatch] = useState<RefMatchState>(REF_MATCH_INIT);
  const refMatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refMatchDropdownRef = useRef<HTMLDivElement>(null);
  const [takimSuggestEv, setTakimSuggestEv] = useState<TakimSuggestLaneState>(TAKIM_SUGGEST_INIT);
  const [takimSuggestDep, setTakimSuggestDep] = useState<TakimSuggestLaneState>(TAKIM_SUGGEST_INIT);
  const takimEvTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const takimDepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const takimEvDropdownRef = useRef<HTMLDivElement>(null);
  const takimDepDropdownRef = useRef<HTMLDivElement>(null);
  const takimSuggestEvGenRef = useRef(0);
  const takimSuggestDepGenRef = useRef(0);
  const [personelSuggestHakem, setPersonelSuggestHakem] = useState<TakimSuggestLaneState>(TAKIM_SUGGEST_INIT);
  const [personelSuggestAntEv, setPersonelSuggestAntEv] = useState<TakimSuggestLaneState>(TAKIM_SUGGEST_INIT);
  const [personelSuggestAntDep, setPersonelSuggestAntDep] = useState<TakimSuggestLaneState>(TAKIM_SUGGEST_INIT);
  const [personelSuggestAntHer, setPersonelSuggestAntHer] = useState<TakimSuggestLaneState>(TAKIM_SUGGEST_INIT);
  const personelHakemTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const personelAntEvTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const personelAntDepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const personelAntHerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const personelHakemDropdownRef = useRef<HTMLDivElement>(null);
  const personelAntEvDropdownRef = useRef<HTMLDivElement>(null);
  const personelAntDepDropdownRef = useRef<HTMLDivElement>(null);
  const personelAntHerDropdownRef = useRef<HTMLDivElement>(null);
  const personelHakemGenRef = useRef(0);
  const personelAntEvGenRef = useRef(0);
  const personelAntDepGenRef = useRef(0);
  const personelAntHerGenRef = useRef(0);

  useEffect(() => { lsSet(LS_COL_ORDER, colOrder); }, [colOrder]);
  useEffect(() => { lsSet(LS_COL_WIDTHS, colWidths); }, [colWidths]);
  useEffect(() => { lsSet(LS_COL_CLICK_POS, colClickPos); }, [colClickPos]);
  useEffect(() => { lsSet(LS_SHOW_DIGIT_ROW, showDigitRow); }, [showDigitRow]);
  useEffect(() => { lsSet(LS_DIGIT_POS_MODE, digitPosMode); }, [digitPosMode]);
  useEffect(() => { lsSet(LS_COL_DIGIT_MODE, colDigitMode); }, [colDigitMode]);
  useEffect(() => { lsSet(LS_BIDIR, bidirFilters); }, [bidirFilters]);
  useEffect(() => { lsSet(LS_SHOW_BIDIR, showBidirRow); }, [showBidirRow]);

  /** pattern → committed (Enter basmadan çıkınca da API’ye gitsin; Dep’in “çalışmıyor” görünümü çoğunlukla bundandı). */
  const commitBidirLaneOnBlur = useCallback((side: "takim" | "takimid", lane: "ev" | "dep") => {
    setBidirFilters((prev) => {
      const b = prev[side][lane];
      const next = b.pattern.trim();
      if (next === b.committed.trim()) return prev;
      return {
        ...prev,
        [side]: { ...prev[side], [lane]: { ...b, committed: next } },
      };
    });
  }, []);

  // Ref maç: pattern oluştur ve doğru filtreye yaz
  const applyRefToBidir = useCallback((
    match: Match,
    field: RefMatchField,
    positions: number[],
  ) => {
    const pat = buildRefPattern(match, field, positions, digitPosMode);
    if (!pat) return;
    if (field === "t1i" || field === "t2i") {
      setBidirFilters((prev) => ({
        ...prev,
        takimid:
          field === "t1i"
            ? { ...prev.takimid, ev: { pattern: pat, committed: pat } }
            : { ...prev.takimid, dep: { pattern: pat, committed: pat } },
      }));
    } else {
      const colId = REF_FIELD_TO_COL_ID[field];
      if (colId) {
        setColFilters((prev) => {
          const next = { ...prev, [colId]: pat };
          commitColFilters(next);
          return next;
        });
      }
    }
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setBidirFilters, setColFilters, digitPosMode]);

  // Ref maç arama (debounced)
  const searchRefMatches = useCallback(async (q: string) => {
    if (!q.trim()) {
      setRefMatch((prev) => ({ ...prev, results: [], isOpen: false, loading: false }));
      return;
    }
    setRefMatch((prev) => ({ ...prev, loading: true, isOpen: true }));
    try {
      const p = new URLSearchParams({ limit: "20" });
      const num = Number(q.trim());
      if (!isNaN(num) && q.trim().length > 3) {
        p.set("cf_id", q.trim());
      } else {
        p.set("takim", q.trim());
      }
      const res = await fetch(`/api/matches?${p}`);
      const json: ApiResponse = await res.json();
      setRefMatch((prev) => ({ ...prev, results: json.data ?? [], loading: false, isOpen: true }));
    } catch {
      setRefMatch((prev) => ({ ...prev, results: [], loading: false }));
    }
  }, []);

  const searchTakimSuggest = useCallback(async (q: string, lane: "ev" | "dep") => {
    const genRef = lane === "ev" ? takimSuggestEvGenRef : takimSuggestDepGenRef;
    const setLane = lane === "ev" ? setTakimSuggestEv : setTakimSuggestDep;
    if (!q.trim()) {
      setLane(TAKIM_SUGGEST_INIT);
      return;
    }
    const myGen = ++genRef.current;
    setLane((prev) => ({ ...prev, loading: true, open: true }));
    try {
      const p = new URLSearchParams({ q: q.trim(), lane });
      const res = await fetch(`/api/team-suggest?${p}`);
      const json = (await res.json()) as { teams?: string[]; error?: string };
      if (genRef.current !== myGen) return;
      if (!res.ok) {
        setLane({ open: true, loading: false, teamNames: [] });
        return;
      }
      setLane({ open: true, loading: false, teamNames: Array.isArray(json.teams) ? json.teams : [] });
    } catch {
      if (genRef.current !== myGen) return;
      setLane({ open: true, loading: false, teamNames: [] });
    }
  }, []);

  const searchPersonelSuggest = useCallback(
    async (q: string, role: "hakem" | "t1_antrenor" | "t2_antrenor" | "ant_ev_veya_dep") => {
      const cfg =
        role === "hakem"
          ? { genRef: personelHakemGenRef, setLane: setPersonelSuggestHakem }
          : role === "t1_antrenor"
            ? { genRef: personelAntEvGenRef, setLane: setPersonelSuggestAntEv }
            : role === "t2_antrenor"
              ? { genRef: personelAntDepGenRef, setLane: setPersonelSuggestAntDep }
              : { genRef: personelAntHerGenRef, setLane: setPersonelSuggestAntHer };
      if (!q.trim()) {
        cfg.setLane(TAKIM_SUGGEST_INIT);
        return;
      }
      const myGen = ++cfg.genRef.current;
      cfg.setLane((prev) => ({ ...prev, loading: true, open: true }));
      try {
        const p = new URLSearchParams({ q: q.trim(), role });
        const res = await fetch(`/api/personel-suggest?${p}`);
        const json = (await res.json()) as { names?: string[]; error?: string };
        if (cfg.genRef.current !== myGen) return;
        if (!res.ok) {
          cfg.setLane({ open: true, loading: false, teamNames: [] });
          return;
        }
        cfg.setLane({
          open: true,
          loading: false,
          teamNames: Array.isArray(json.names) ? json.names : [],
        });
      } catch {
        if (cfg.genRef.current !== myGen) return;
        cfg.setLane({ open: true, loading: false, teamNames: [] });
      }
    },
    []
  );

  // Ref + Takım + Personel öneri dropdown’ları: dışına tıklayınca kapat
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (refMatchDropdownRef.current && !refMatchDropdownRef.current.contains(t)) {
        setRefMatch((prev) => ({ ...prev, isOpen: false }));
      }
      if (takimEvDropdownRef.current && !takimEvDropdownRef.current.contains(t)) {
        setTakimSuggestEv((prev) => ({ ...prev, open: false }));
      }
      if (takimDepDropdownRef.current && !takimDepDropdownRef.current.contains(t)) {
        setTakimSuggestDep((prev) => ({ ...prev, open: false }));
      }
      if (personelHakemDropdownRef.current && !personelHakemDropdownRef.current.contains(t)) {
        setPersonelSuggestHakem((prev) => ({ ...prev, open: false }));
      }
      if (personelAntEvDropdownRef.current && !personelAntEvDropdownRef.current.contains(t)) {
        setPersonelSuggestAntEv((prev) => ({ ...prev, open: false }));
      }
      if (personelAntDepDropdownRef.current && !personelAntDepDropdownRef.current.contains(t)) {
        setPersonelSuggestAntDep((prev) => ({ ...prev, open: false }));
      }
      if (personelAntHerDropdownRef.current && !personelAntHerDropdownRef.current.contains(t)) {
        setPersonelSuggestAntHer((prev) => ({ ...prev, open: false }));
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // görünüm presetleri
  const [viewPresets, setViewPresets] = useState<ViewPreset[]>(
    () => lsGet<ViewPreset[]>(LS_VIEW_PRESETS, [])
  );
  const [viewPresetInput, setViewPresetInput] = useState("");
  const [viewSaveMsg, setViewSaveMsg] = useState("");

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const dx = e.clientX - r.startX;
      const w = Math.min(COL_W_MAX, Math.max(COL_W_MIN, r.startW + dx));
      setColWidths((prev) => ({ ...prev, [r.id]: w }));
    };
    const onUp = () => {
      resizeRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // localStorage otomatik kaydet
  useEffect(() => { lsSet(LS_VISIBLE,  Array.from(visibleIds)); }, [visibleIds]);
  useEffect(() => { lsSet(LS_TOP_FILT, filters); },                [filters]);

  const colW = useCallback(
    (c: ColDef) => colWidths[c.id] ?? c.width ?? 60,
    [colWidths]
  );

  const visibleCols = useMemo(
    () => orderedVisibleCols(mergedCols, visibleIds, colOrder),
    [mergedCols, visibleIds, colOrder]
  );
  const groupSpans = useMemo(() => buildGroupSpans(visibleCols), [visibleCols]);
  const groups       = Array.from(new Set(mergedCols.map((c) => c.group)));
  /** table-fixed + %100 genişlik sütunları ezmesin — yatay kaydır */
  const tableScrollWidth = useMemo(
    () => 16 + visibleCols.reduce((s, c) => s + colW(c), 0),
    [visibleCols, colW]
  );

  /** Input (`colFilters`) anlık; API/commit (`colFiltersCommitted`) 400ms gecikmeli.
   *  İstemci süzümü yalnız committed’e bakarsa ekranda `<22` varken tablo hâlâ süzülmemiş görünür. */
  const colFiltersEffective = useMemo(
    () => ({ ...colFiltersCommitted, ...colFilters }),
    [colFiltersCommitted, colFilters]
  );

  // İstemci tarafı filtre: CF_CLIENT_ONLY_COL_IDS + hesaplamalı sütunlar
  // (mbs, suffix3, suffix4 ve tüm macid_obktb_* — 7-haneli formül DB ile uyuşmadığı için)
  const rawColFilters = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [id, v] of normalizedColFilterEntries(colFiltersEffective)) {
      if (CF_CLIENT_ONLY_COL_IDS.has(id) || isCellValClientCol(id)) m[id] = v;
    }
    return m;
  }, [colFiltersEffective]);
  const filteredRows = useMemo(
    () => applyColFilters(matches, rawColFilters, mergedCols),
    [matches, rawColFilters, mergedCols]
  );

  // ── Sıralama ──────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (colId: string) => {
    if (sortCol !== colId) {
      setSortCol(colId);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      // desc'ten sonra sıralamayı kaldır
      setSortCol(null);
      setSortDir("asc");
    }
  };

  // dbCol filtreleri değişince server fetch.
  // NOT: *_obktb_* sütunları da sunucuya iletilir — sunucu basit sayısal
  // ifadeleri RPC ile ID'ye indirger (pagination tutarsızlığını önler).
  // mbs/suffix3/suffix4 istemcide kalır (ayrı suffix3/suffix4 üst paramı üzerinden
  // server-side ayrıca filtrelenir).
  const [dbColFiltersApplied, setDbColFiltersApplied] = useState<Record<string,string>>({});
  useEffect(() => {
    const dbPart = Object.fromEntries(
      normalizedColFilterEntries(colFiltersCommitted).filter(([id]) => {
        if (CF_CLIENT_ONLY_COL_IDS.has(id)) return false;
        if (CELL_VAL_CLIENT_COL_IDS_STATIC.has(id)) return false; // mbs/suffix3/suffix4
        return true; // *_obktb_* dahil — server push dener
      })
    );
    setDbColFiltersApplied(dbPart);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colFiltersCommitted]);

  /** Üst / sütun MBS (suffix4) filtresi: tüm satırlarda aynı sonek. Boşsa satıra göre maç kodu son N hane. */
  const globalKodSuffix = useMemo(() => {
    return (
      normalizeKodSuffixDigits(String(applied.suffix4 ?? ""), kodSuffixN) ??
      normalizeKodSuffixDigits(String(dbColFiltersApplied.suffix4 ?? ""), kodSuffixN) ??
      null
    );
  }, [applied.suffix4, dbColFiltersApplied.suffix4, kodSuffixN]);

  /** Üst / cf MBS filtresi aktifse satır alanı mac_suffix4; yoksa Kod açılır listesindeki alan. */
  const kodSuffixFilterRowKey = useMemo(() => {
    const fromApplied = normalizeKodSuffixDigits(String(applied.suffix4 ?? ""), kodSuffixN);
    const fromCf = normalizeKodSuffixDigits(String(dbColFiltersApplied.suffix4 ?? ""), kodSuffixN);
    if (fromApplied != null || fromCf != null) return "mac_suffix4";
    return kodSuffixRefKey;
  }, [applied.suffix4, dbColFiltersApplied.suffix4, kodSuffixN, kodSuffixRefKey]);

  /** Sabit sonek varken yalnızca o son N haneye uyan satırlar (sarı vurgu + liste birlikte). */
  const kodSuffixFilteredRows = useMemo(() => {
    if (!globalKodSuffix) return filteredRows;
    return filteredRows.filter((row) => {
      const suf = normalizeKodSuffixDigits(String(row[kodSuffixFilterRowKey] ?? ""), kodSuffixN);
      return suf === globalKodSuffix;
    });
  }, [filteredRows, globalKodSuffix, kodSuffixN, kodSuffixFilterRowKey]);

  const sortedRows = useMemo(() => {
    if (!sortCol) return kodSuffixFilteredRows;
    const col = mergedCols.find((c) => c.id === sortCol);
    if (!col) return kodSuffixFilteredRows;
    return [...kodSuffixFilteredRows].sort((a, b) => {
      const av = cellVal(a, col);
      const bv = cellVal(b, col);
      const an = Number(av), bn = Number(bv);
      let cmp: number;
      if (av !== "" && bv !== "" && !isNaN(an) && !isNaN(bn)) {
        cmp = an - bn;
      } else {
        cmp = av.localeCompare(bv, "tr", { sensitivity: "base" });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [kodSuffixFilteredRows, sortCol, sortDir, mergedCols]);

  /**
   * `/api/matches` için page/limit hariç tüm sorgu parametreleri.
   * Tarama modu “tüm veride ara” bu parametrelere `tarama_q` + sayfa ekleyerek çağırır.
   */
  const buildMatchesApiParams = useCallback(
    (opts?: { forPicker?: boolean }): URLSearchParams => {
      const p = new URLSearchParams();
      // bidir_* önce: çok cf_ ile uzun URL’de proxy kesintisi riskini azaltır
      const te = bidirFilters.takim.ev.committed.trim();
      const td = bidirFilters.takim.dep.committed.trim();
      if (te) p.set("bidir_takim_ev", te);
      if (td) p.set("bidir_takim_dep", td);
      const tie = bidirFilters.takimid.ev.committed.trim();
      const tid = bidirFilters.takimid.dep.committed.trim();
      if (tie) p.set("bidir_takimid_ev", tie);
      if (tid) p.set("bidir_takimid_dep", tid);
      const ph = bidirFilters.personel.hakem.committed.trim();
      const pEv = bidirFilters.personel.antEv.committed.trim();
      const pDep = bidirFilters.personel.antDep.committed.trim();
      const pHer = bidirFilters.personel.antHer.committed.trim();
      if (ph) p.set("bidir_hakem", ph);
      if (pEv) p.set("bidir_ant_ev", pEv);
      if (pDep) p.set("bidir_ant_dep", pDep);
      if (pHer) p.set("bidir_ant", pHer);
      Object.entries(applied).forEach(([k, v]) => {
        if (v.trim()) p.set(k, v.trim());
      });
      const fid = focusMatchId?.trim();
      Object.entries(dbColFiltersApplied).forEach(([id, v]) => {
        if (!v.trim()) return;
        if (anyKodSuffix && shouldSuppressCfWhenKsAny(id)) return;
        if (id === "id" && fid && !opts?.forPicker) return;
        p.set(`cf_${id}`, v.trim());
      });
      if (!opts?.forPicker && fid) p.set("cf_id", fid);
      // Panel KOD son hane filtresi: herhangi bir KOD sütunu eşleşen satırlar
      if (anyKodSuffix) {
        p.set("ks_any_suffix", anyKodSuffix.digits);
        p.set("ks_any_n", String(anyKodSuffix.n));
      }
      return p;
    },
    [
      applied,
      dbColFiltersApplied,
      focusMatchId,
      bidirFilters.takim.ev.committed,
      bidirFilters.takim.dep.committed,
      bidirFilters.takimid.ev.committed,
      bidirFilters.takimid.dep.committed,
      bidirFilters.personel.hakem.committed,
      bidirFilters.personel.antEv.committed,
      bidirFilters.personel.antDep.committed,
      bidirFilters.personel.antHer.committed,
      anyKodSuffix,
    ],
  );

  const pickerFilterKey = useMemo(
    () =>
      JSON.stringify({
        applied,
        db: dbColFiltersApplied,
        te: bidirFilters.takim.ev.committed,
        td: bidirFilters.takim.dep.committed,
        tie: bidirFilters.takimid.ev.committed,
        tid: bidirFilters.takimid.dep.committed,
        ph: bidirFilters.personel.hakem.committed,
        pEv: bidirFilters.personel.antEv.committed,
        pDep: bidirFilters.personel.antDep.committed,
        pHer: bidirFilters.personel.antHer.committed,
        ks: anyKodSuffix,
      }),
    [
      applied,
      dbColFiltersApplied,
      bidirFilters.takim.ev.committed,
      bidirFilters.takim.dep.committed,
      bidirFilters.takimid.ev.committed,
      bidirFilters.takimid.dep.committed,
      bidirFilters.personel.hakem.committed,
      bidirFilters.personel.antEv.committed,
      bidirFilters.personel.antDep.committed,
      bidirFilters.personel.antHer.committed,
      anyKodSuffix,
    ],
  );

  const applyManualKodSuffixFilter = useCallback(() => {
    const n = Number(String(manualKsN).trim());
    const digits = manualKsDigits.replace(/\D/g, "");
    if (!Number.isInteger(n) || n < KS_PANEL_CODE_PICK_N_MIN || n > KS_PANEL_CODE_PICK_N_MAX) return;
    if (digits.length !== n || !/^\d+$/.test(digits)) return;
    setAnyKodSuffix({ n, digits });
    setPage(1);
  }, [manualKsN, manualKsDigits]);

  useEffect(() => {
    if (!loadedSavedFilterName) {
      setPickerRows([]);
      setPickerPartial(false);
      setPickerSelectedIndex(null);
      return;
    }
    let cancelled = false;
    setPickerLoading(true);
    const p = buildMatchesApiParams({ forPicker: true });
    p.set("oynanmamis", "1");
    p.set("pick", "stb");
    p.set("limit", "500");
    p.set("page", "1");
    fetch(`/api/matches?${p.toString()}`)
      .then((r) => r.json())
      .then((j: ApiResponse) => {
        if (cancelled) return;
        const rows = (j.data ?? []) as PickerMatchRow[];
        setPickerRows(rows);
        setPickerPartial(Boolean(j.pickerPartial));
        // pickerFilterKey maç seçilince de değişebilir (Maça göre doldur); burada
        // odak sıfırlanmasın — aksi halde liste yenilenince hep "— Maç seç —"e döner.
      })
      .catch(() => {
        if (!cancelled) {
          setPickerRows([]);
          setPickerPartial(false);
        }
      })
      .finally(() => {
        if (!cancelled) setPickerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadedSavedFilterName, pickerFilterKey, buildMatchesApiParams]);

  useEffect(() => {
    if (pickerRows.length === 0) {
      setPickerSelectedIndex(null);
      return;
    }
    if (!focusMatchId) {
      setPickerSelectedIndex(null);
      return;
    }
    const idx = pickerRows.findIndex((r) => String(r.id) === focusMatchId);
    if (idx < 0) {
      setPickerSelectedIndex(null);
      setFocusMatchId(null);
      return;
    }
    setPickerSelectedIndex((prev) => (prev === idx ? prev : idx));
  }, [focusMatchId, pickerRows]);

  const applyReferenceFieldsFromPickerRow = useCallback(
    (row: PickerMatchRow) => {
      if (!refAutoFillFromPicker) return;
      const iso = normalizePickerRowTarihIso(row.tarih);
      const sa = formatSaatCfFromPickerRow(row);
      const ligStr =
        typeof row.lig_adi === "string" ? row.lig_adi.trim() : "";

      setFilters((f) => ({
        ...f,
        ...(iso
          ? { tarih_from: iso, tarih_to: iso, tarih_gun: "", tarih_ay: "", tarih_yil: "" }
          : {}),
        ...(ligStr ? { lig: ligStr } : {}),
      }));
      setApplied((a) => ({
        ...a,
        ...(iso
          ? { tarih_from: iso, tarih_to: iso, tarih_gun: "", tarih_ay: "", tarih_yil: "" }
          : {}),
        ...(ligStr ? { lig: ligStr } : {}),
      }));
      if (iso) setTarihPick({ d: "", m: "" });

      if (sa) {
        setColFilters((cf) => ({ ...cf, saat: sa }));
        setColFiltersCommitted((c) => {
          const next = { ...c, saat: sa };
          lsSet(LS_COL_FILT, next);
          return next;
        });
      }
    },
    [refAutoFillFromPicker],
  );

  const goPickerPrev = useCallback(() => {
    if (pickerRows.length === 0) return;
    const from = pickerSelectedIndex != null ? pickerSelectedIndex : 0;
    const ni = (from - 1 + pickerRows.length) % pickerRows.length;
    const row = pickerRows[ni]!;
    applyReferenceFieldsFromPickerRow(row);
    setPickerSelectedIndex(ni);
    setFocusMatchId(String(row.id));
    setPage(1);
  }, [pickerRows, pickerSelectedIndex, applyReferenceFieldsFromPickerRow]);

  const goPickerNext = useCallback(() => {
    if (pickerRows.length === 0) return;
    const from = pickerSelectedIndex != null ? pickerSelectedIndex : -1;
    const ni = (from + 1) % pickerRows.length;
    const row = pickerRows[ni]!;
    applyReferenceFieldsFromPickerRow(row);
    setPickerSelectedIndex(ni);
    setFocusMatchId(String(row.id));
    setPage(1);
  }, [pickerRows, pickerSelectedIndex, applyReferenceFieldsFromPickerRow]);

  /** Maç odak (cf_id) kapat; açılır liste — Maç seç — konumuna döner. */
  const clearPickerMatchFocus = useCallback(() => {
    setFocusMatchId(null);
    setPickerSelectedIndex(null);
    setPage(1);
  }, []);

  // veri çek
  const fetchMatches = useCallback(async () => {
    const myGen = ++matchesFetchGenRef.current;
    setLoading(true);
    setFetchError(null);
    const p = buildMatchesApiParams();
    p.set("page", String(page));
    p.set("limit", "100");
    try {
      const [res, syncRes] = await Promise.all([
        fetch(`/api/matches?${p}`),
        fetch("/api/sync-status"),
      ]);
      const json: ApiResponse = await res.json();
      if (matchesFetchGenRef.current !== myGen) return;
      if (!res.ok) {
        const hint = [json.error, json.detail, json.code ? `(${json.code})` : ""]
          .filter((x) => typeof x === "string" && x.trim().length > 0)
          .join(" — ");
        setFetchError(hint.trim() || `Sunucu hatası (${res.status})`);
        setMatches([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }
      const tp = Math.max(0, json.totalPages ?? 0);
      const t = json.total ?? 0;
      setMatches(json.data || []);
      setTotal(t);
      setTotalPages(tp);
      // Dar filtre sonrası toplam sayfa küçülürken sayfa eski kalırsa API boş sayfa döner → "Veri yok"
      if (tp > 0 && page > tp) setPage(tp);
      else if (tp === 0 && page !== 1) setPage(1);
      if (syncRes.ok) {
        const s = (await syncRes.json()) as { lastSyncAt?: string | null };
        if (matchesFetchGenRef.current === myGen) {
        setLastSyncAt(s.lastSyncAt ?? null);
      }
      }
    } catch {
      if (matchesFetchGenRef.current === myGen) {
        setMatches([]);
        setFetchError("Ağ hatası veya yanıt okunamadı.");
      }
    } finally {
      if (matchesFetchGenRef.current === myGen) setLoading(false);
    }
  }, [page, buildMatchesApiParams]);
  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  const recalcTableLoadGuard = useCallback(() => {
    const el = tableScrollAreaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTableLoadGuardRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });
  }, []);

  useLayoutEffect(() => {
    if (!loading) {
      setTableLoadGuardRect(null);
      return;
    }
    recalcTableLoadGuard();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        recalcTableLoadGuard();
      });
    });
    const el = tableScrollAreaRef.current;
    const ro = el ? new ResizeObserver(() => { recalcTableLoadGuard(); }) : null;
    if (el && ro) ro.observe(el);
    const onViewport = () => { recalcTableLoadGuard(); };
    window.addEventListener("resize", onViewport);
    window.addEventListener("scroll", onViewport, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onViewport);
      window.removeEventListener("scroll", onViewport, true);
    };
  }, [loading, recalcTableLoadGuard]);

  // panel dışı tıkla kapat
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShowColPanel(false); };
    if (showColPanel) document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [showColPanel]);

  // Skor kutusu dışı tıkla kapat
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (scoreBoxRef.current && !scoreBoxRef.current.contains(e.target as Node)) setShowScoreBox(false);
    };
    if (showScoreBox) document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [showScoreBox]);

  /** Eşleştirme sonucunu tabloya uygula: id listesini cf_id'ye koy */
  const applyEslestirmeIdList = useCallback((ids: number[], label: string) => {
    if (ids.length === 0) {
      alert("Bu kategoride maç yok.");
      return;
    }
    // URL sığdırma + backend performansı için limit
    const MAX = 5000;
    const clipped = ids.length > MAX ? ids.slice(0, MAX) : ids;
    const idsStr = clipped.join(",");
    setColFilters((prev) => {
      const next = { ...prev, id: idsStr };
      commitColFilters(next);
      return next;
    });
    setEslestirmeLabel(ids.length > MAX ? `${label} (ilk ${MAX})` : label);
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Eşleştirme etiketini (ve id filtresini) temizle */
  const clearEslestirme = useCallback(() => {
    setColFilters((prev) => {
      const next = { ...prev };
      delete next.id;
      commitColFilters(next);
      return next;
    });
    setEslestirmeLabel(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Eşleştirme Paneli için kapsam: tablodaki mevcut filtreleri derle */
  const eslestirmeCurrentScope: EslestirmeScope = useMemo(() => {
    const altLigRaw = colFiltersCommitted.alt_lig_id?.trim();
    const altLigNum = altLigRaw && /^\d+$/.test(altLigRaw) ? Number(altLigRaw) : undefined;
    return {
      sonuc_iy: (colFiltersCommitted.sonuc_iy ?? "").trim() || undefined,
      sonuc_ms: (colFiltersCommitted.sonuc_ms ?? "").trim() || undefined,
      tarih_from: applied.tarih_from?.trim() || undefined,
      tarih_to: applied.tarih_to?.trim() || undefined,
      lig_adi: (colFiltersCommitted.lig_adi ?? "").trim() || undefined,
      alt_lig_id: altLigNum,
    };
  }, [colFiltersCommitted, applied.tarih_from, applied.tarih_to]);

  /** Skor combo'sunu cell filtrelerine uygular + recent listesine ekler */
  const applyScoreCombo = useCallback((iy: string, ms: string) => {
    const iyT = iy.trim();
    const msT = ms.trim();
    const next = { ...colFilters };
    if (iyT) next.sonuc_iy = iyT; else delete next.sonuc_iy;
    if (msT) next.sonuc_ms = msT; else delete next.sonuc_ms;
    setColFilters(next);
    commitColFilters(next);
    // recent list
    if (iyT || msT) {
      setScoreRecent((prev) => {
        const filtered = prev.filter((s) => !(s.iy === iyT && s.ms === msT));
        const updated = [{ iy: iyT, ms: msT }, ...filtered].slice(0, 5);
        lsSet(LS_SCORE_RECENT, updated);
        return updated;
      });
    }
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colFilters]);

  /**
   * 💾 Filtrelerim — güncel filtre durumunun serialize edilmiş özeti.
   * Sunucuya kaydedilecek payload budur. `v` şema versiyonudur; ileride
   * alan eklendiğinde eski kayıtları tolere edebilmek için.
   */
  const captureFilterSnapshot = useCallback((): Record<string, unknown> => ({
    v: 1,
    colFilters: colFiltersCommitted,
    colClickPos,
    colDigitMode,
    digitPosMode,
    anyKodSuffix,
    bidirFilters,
    tarihPick,
    topFilters: filters,
  }), [colFiltersCommitted, colClickPos, colDigitMode, digitPosMode, anyKodSuffix, bidirFilters, tarihPick, filters]);

  /**
   * 💾 Kayıtlı bir snapshot'ı state'lere uygular. Eksik alanlar tolere edilir;
   * şema versiyonu ileride değişirse burada fallback/migrate yapılır.
   */
  const applyFilterSnapshot = useCallback((payload: Record<string, unknown>, _name: string) => {
    const p = payload ?? {};
    // Sütun filtreleri
    if (p.colFilters && typeof p.colFilters === "object") {
      const cf = p.colFilters as Record<string, string>;
      setColFilters(cf);
      setColFiltersCommitted(cf);
      lsSet(LS_COL_FILT, cf);
    } else {
      setColFilters({});
      setColFiltersCommitted({});
      lsSet(LS_COL_FILT, {});
    }
    // Hane kutu seçimleri
    setColClickPos((p.colClickPos && typeof p.colClickPos === "object")
      ? (p.colClickPos as Record<string, number[]>)
      : {});
    // Per-col H/A override
    setColDigitMode((p.colDigitMode && typeof p.colDigitMode === "object")
      ? (p.colDigitMode as Record<string, DigitPosMode>)
      : {});
    // Global H/A modu
    if (p.digitPosMode === "contains" || p.digitPosMode === "positional") {
      setDigitPosMode(p.digitPosMode);
    }
    // ◉ panel / KOD son elle
    if (p.anyKodSuffix && typeof p.anyKodSuffix === "object") {
      const o = p.anyKodSuffix as { digits?: unknown; n?: unknown };
      const digits = String(o.digits ?? "").replace(/\D/g, "");
      const n = Number(o.n);
      const ok =
        /^\d+$/.test(digits) &&
        digits.length === n &&
        Number.isInteger(n) &&
        n >= KS_PANEL_CODE_PICK_N_MIN &&
        n <= KS_PANEL_CODE_PICK_N_MAX;
      setAnyKodSuffix(ok ? { digits, n } : null);
    } else {
      setAnyKodSuffix(null);
    }
    // ⇄ çift yönlü satır
    if (p.bidirFilters && typeof p.bidirFilters === "object") {
      setBidirFilters(p.bidirFilters as BidirFiltersState);
    } else {
      setBidirFilters(BIDIR_INIT);
    }
    // Tarih pick widget
    if (p.tarihPick && typeof p.tarihPick === "object") {
      setTarihPick(p.tarihPick as { d: string; m: string });
    } else {
      setTarihPick({ d: "", m: "" });
    }
    // Üst tarih filtreleri
    if (p.topFilters && typeof p.topFilters === "object") {
      const tf = p.topFilters as typeof EMPTY_TOP;
      setFilters(tf);
      setApplied(tf);
    } else {
      setFilters(EMPTY_TOP);
      setApplied(EMPTY_TOP);
    }
    setPage(1);
    setEslestirmeLabel(null);
  }, []);

  // sütun işlemleri
  function toggleCol(id: string) { setVisibleIds((p) => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }
  function toggleGroup(grp: string) {
    const ids = mergedCols.filter((c) => c.group===grp).map((c) => c.id);
    const allOn = ids.every((id) => visibleIds.has(id));
    setVisibleIds((p) => { const n=new Set(p); ids.forEach((id) => allOn?n.delete(id):n.add(id)); return n; });
  }
  function selectAll()  { setVisibleIds(new Set(mergedCols.map((c) => c.id))); }
  function resetCols()  { const d=new Set(DEFAULT_VISIBLE); setVisibleIds(d); lsSet(LS_VISIBLE, Array.from(d)); }
  function hideAll()    { setVisibleIds(new Set()); }

  // preset işlemleri
  function saveColPreset() {
    const name = presetInput.trim();
    if (!name) return;
    const updated = [{ name, ids: Array.from(visibleIds) }, ...colPresets.filter((p) => p.name !== name)];
    setColPresets(updated);
    lsSet(LS_PRESETS, updated);
    setPresetInput("");
    setSaveMsg(`"${name}" kaydedildi`);
    setTimeout(() => setSaveMsg(""), 2000);
  }
  function loadColPreset(p: ColPreset) { setVisibleIds(new Set(p.ids)); }
  function deleteColPreset(name: string) {
    const updated = colPresets.filter((p) => p.name !== name);
    setColPresets(updated);
    lsSet(LS_PRESETS, updated);
  }

  /**
   * Liste sorgusunu “ilk açılış” gibi yapar: üst şerit (Lig, Takım, Tarih, …), tüm sütun
   * cf_* / debounce, ⇄, ◉ son hane, maç odak (cf_id), kayıtlı filtre şeridi, sıralama,
   * skor kutusu, tarama paneli. Sütun görünürlüğü / genişlik aynı kalır.
   */
  const resetAllListFiltersToDefault = useCallback(() => {
    setColFilters({});
    setColFiltersCommitted({});
    lsSet(LS_COL_FILT, {});
    setColClickPos({});
    setDigitPosMode("contains");
    setColDigitMode({});
    takimSuggestEvGenRef.current += 1;
    takimSuggestDepGenRef.current += 1;
    personelHakemGenRef.current += 1;
    personelAntEvGenRef.current += 1;
    personelAntDepGenRef.current += 1;
    personelAntHerGenRef.current += 1;
    if (refMatchTimerRef.current) clearTimeout(refMatchTimerRef.current);
    refMatchTimerRef.current = null;
    if (takimEvTimerRef.current) clearTimeout(takimEvTimerRef.current);
    takimEvTimerRef.current = null;
    if (takimDepTimerRef.current) clearTimeout(takimDepTimerRef.current);
    takimDepTimerRef.current = null;
    if (personelHakemTimerRef.current) clearTimeout(personelHakemTimerRef.current);
    personelHakemTimerRef.current = null;
    if (personelAntEvTimerRef.current) clearTimeout(personelAntEvTimerRef.current);
    personelAntEvTimerRef.current = null;
    if (personelAntDepTimerRef.current) clearTimeout(personelAntDepTimerRef.current);
    personelAntDepTimerRef.current = null;
    if (personelAntHerTimerRef.current) clearTimeout(personelAntHerTimerRef.current);
    personelAntHerTimerRef.current = null;
    setBidirFilters(BIDIR_INIT);
    setRefMatch(REF_MATCH_INIT);
    setTakimSuggestEv(TAKIM_SUGGEST_INIT);
    setTakimSuggestDep(TAKIM_SUGGEST_INIT);
    setPersonelSuggestHakem(TAKIM_SUGGEST_INIT);
    setPersonelSuggestAntEv(TAKIM_SUGGEST_INIT);
    setPersonelSuggestAntDep(TAKIM_SUGGEST_INIT);
    setPersonelSuggestAntHer(TAKIM_SUGGEST_INIT);
    setAnyKodSuffix(null);
    setCodePick(null);
    setEslestirmeLabel(null);
    setTarihPick({ d: "", m: "" });
    const top = { ...EMPTY_TOP };
    setFilters(top);
    setApplied(top);
    lsSet(LS_TOP_FILT, top);
    setFocusMatchId(null);
    setLoadedSavedFilterName(null);
    setSortCol(null);
    setSortDir("asc");
    setShowScoreBox(false);
    setScoreIy("");
    setScoreMs("");
    setShowTarama(false);
    setPage(1);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") resetAllListFiltersToDefault();
    });
    return () => subscription.unsubscribe();
  }, [resetAllListFiltersToDefault]);

  const codePickSuffixColumns = KS_PANEL_CODE_PICK_BASE_NS;

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const codePickPanelW = Math.min(
    Math.min(520, 200 + codePickSuffixColumns.length * 56),
    viewportW - 16,
  );
  const codePickPanelH = Math.min(440, viewportH - 24);

  /** Sunucu bu sayfada döndürdüğü satırların bir kısmı MBS/MsMKT/MBS sonek veya OKBT istemci süzümüyle elenir. */
  const clientPageRowGap = !loading && matches.length > 0 && matches.length !== sortedRows.length;

  return (
    <div className="flex flex-col h-screen bg-gray-200 text-gray-900 overflow-hidden">

      {/* ── HEADER ── */}
      <header className="relative z-50 isolate flex-none min-w-0 shrink-0 border-b border-gray-300 bg-gray-300">
        {fetchError && (
          <div
            className="px-4 py-1.5 text-xs text-red-900 bg-red-100 border-b border-red-200"
            role="alert">
            {fetchError}
          </div>
        )}
        {/* Üst bilgi: mobilde satır kırılır; kontroller ayrı şeritte yatay kaydırılır */}
        <div className="px-4 pt-2 pb-1 text-xs text-gray-700 leading-snug break-words">
          <span
            className="tabular-nums"
            title={
              clientPageRowGap
                ? "Toplam, sunucu filtreleri + sayfalama ile uyumlu kayıt sayısıdır. Tabloda daha az satır görünüyorsa MBS / MsMKT / MBS sonek veya OKBT sütunları istemcide ek süzülür."
                : undefined
            }>
            {total.toLocaleString("tr-TR")} maç
          </span>
          {!loading && (
            <span className="text-gray-600" title="Bu sayfada tabloda listelenen satır sayısı">
              {" "}
              · <span className="tabular-nums text-gray-800">{sortedRows.length}</span> bu sayfada
            </span>
          )}
            {lastSyncAt && (
              <span className="text-gray-700">
                {" "}
                · son veri çekimi:{" "}
                <span className="text-gray-800 tabular-nums" title="Europe/Istanbul">
                  {formatLastSyncTr(lastSyncAt)}
                </span>
              </span>
            )}
          {loading && (
            <span className="ml-1.5 inline-block w-3 h-3 border-2 border-gray-500 border-t-blue-400 rounded-full animate-spin align-middle" />
          )}
          {(colFiltersRecordHasAnyTrimmed(colFiltersEffective) || globalKodSuffix) && !loading && (
            <span className="text-amber-600">
              {globalKodSuffix ? (
                <>
                  {" "}
                  · {kodSuffixFilteredRows.length} eşleşti
                  <span className="text-amber-700/90 font-normal" title="Yalnızca bu sayfadaki satırlar (son sonek istemci süzümü)">
                    {" "}
                    (bu sayfa)
          </span>
                </>
              ) : (
                <>
                  {" "}
                  · {total.toLocaleString("tr-TR")} sonuç
                  <span
                    className="text-amber-700/90 font-normal"
                    title={
                      clientPageRowGap
                        ? "Sunucu toplamı; bu sayfada tabloda daha az satır görünüyorsa MBS / MsMKT / MBS sonek veya OKBT istemci süzümü satır eliyor."
                        : "Sunucu filtresiyle eşleşen toplam kayıt (sayfalar arası)"
                    }>
                    {" "}
                    {clientPageRowGap ? "(sunucu · tablo ayrı süzülüyor)" : "(tümü)"}
                  </span>
                </>
              )}
            </span>
          )}
          {globalKodSuffix && !loading && (
            <span
              className="text-amber-800"
              title={`Son ${kodSuffixN} rakam eşleşmesi: tablo yalnızca bu soneki taşıyan satırları listeler; oyun kodu hücreleri sarı vurgulanır.`}>
              {" "}
              · son {kodSuffixN}: <span className="font-mono font-semibold">{globalKodSuffix}</span>
            </span>
          )}
        </div>
        {/* Üst araçlar: Bakiye / giriş / Tarama / Sütunlar paneli */}
        <div className="flex min-w-0 flex-col gap-2 px-4 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-2">
          <div
            className="relative flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 sm:ml-auto sm:shrink-0"
            ref={panelRef}>
            {balance != null && (
              <span className="text-xs text-gray-700 whitespace-nowrap">
                Bakiye:{" "}
                <span className="font-semibold text-gray-900">{balance}</span>
              </span>
            )}
            <AuthBar />
            <button
              type="button"
              onClick={() => setShowSavedFilters(true)}
              title="Filtrelerim: kaydet / yükle (kullanıcıya özel, sunucuda)"
              className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 text-xs px-3 py-1.5 rounded transition font-medium whitespace-nowrap">
              💾 Filtrelerim
            </button>
            <a
              href="/akilli-filtre"
              title="Akıllı Filtre: kayıtlı filtre + tek gün maç seçimiyle tüm zamanlarda eşleşenleri bul"
              className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 text-xs px-3 py-1.5 rounded transition font-medium whitespace-nowrap">
              🧠 Akıllı Filtre
            </a>
            <button
              type="button"
              onClick={() => setShowTarama(true)}
              title="Tarama modu: eşleşen maçları sıra sıra büyük kart olarak incele (↑/↓ ile geç)"
              className="bg-slate-800 hover:bg-slate-700 border border-slate-900 text-white text-xs px-3 py-1.5 rounded transition font-medium whitespace-nowrap">
              🔍 Tarama
            </button>
            <button
              type="button"
              onClick={resetAllListFiltersToDefault}
              title="Üst şerit (Lig, Takım, Tarih, skor, MBS…), tüm sütun aramaları, ⇄ satırı, maç odak / kayıtlı filtre şeridi, sıralama, skor kutusu ve tarama modunu sıfırlar; tablo tam listeyi yeniden çeker."
              className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 text-xs px-3 py-1.5 rounded transition font-medium whitespace-nowrap">
              Sütunları temizle
            </button>
            <button
              type="button"
              onClick={() => setShowDigitRow((v) => !v)}
              title="Hane seçici satırını göster / gizle"
              className={`border text-xs px-3 py-1.5 rounded transition font-medium whitespace-nowrap ${
                showDigitRow
                  ? "bg-green-700 border-green-800 text-white hover:bg-green-600"
                  : "bg-white border-gray-300 text-gray-900 hover:bg-gray-100"
              }`}
            >
              {showDigitRow ? "⊞ Hane ✓" : "⊞ Hane"}
            </button>
            {showDigitRow && (
              <button
                type="button"
                onClick={() => setDigitPosMode((m) => m === "contains" ? "positional" : "contains")}
                title={
                  digitPosMode === "contains"
                    ? "Şu an: ≈ Herhangi yerde — seçili haneler kodun herhangi bir pozisyonunda aranır (*09*). Tıkla: tam pozisyon moduna geç."
                    : "Şu an: = Tam pozisyon — seçili hanelerin KOD'da tam o pozisyonda olması aranır (?09???). Tıkla: herhangi yerde moduna geç."
                }
                className={`border text-xs px-2.5 py-1.5 rounded transition font-mono font-bold whitespace-nowrap ${
                  digitPosMode === "contains"
                    ? "bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200"
                    : "bg-purple-100 border-purple-400 text-purple-800 hover:bg-purple-200"
                }`}
              >
                {digitPosMode === "contains" ? "≈ Herhangi" : "= Pozisyon"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowBidirRow((v) => !v)}
              title="Çift yönlü (⇄) arama satırını göster / gizle"
              className={`border text-xs px-3 py-1.5 rounded transition font-medium whitespace-nowrap ${
                showBidirRow
                  ? "bg-blue-700 border-blue-800 text-white hover:bg-blue-600"
                  : "bg-white border-gray-300 text-gray-900 hover:bg-gray-100"
              }`}
            >
              {showBidirRow ? "⇄ Çift Yönlü ✓" : "⇄ Çift Yönlü"}
            </button>
            {/* ⚽ Skor Kutusu */}
            <div ref={scoreBoxRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setScoreIy((colFilters.sonuc_iy ?? "").trim());
                  setScoreMs((colFilters.sonuc_ms ?? "").trim());
                  setShowScoreBox((v) => !v);
                }}
                title="İY / MS skor hızlı filtresi — iki kutuya skorları yazıp Uygula'ya bas"
                className={`border text-xs px-3 py-1.5 rounded transition font-medium whitespace-nowrap ${
                  (colFilters.sonuc_iy?.trim() || colFilters.sonuc_ms?.trim())
                    ? "bg-emerald-700 border-emerald-800 text-white hover:bg-emerald-600"
                    : "bg-white border-gray-300 text-gray-900 hover:bg-gray-100"
                }`}
              >
                {(colFilters.sonuc_iy?.trim() || colFilters.sonuc_ms?.trim())
                  ? `⚽ ${colFilters.sonuc_iy?.trim() || "*"} / ${colFilters.sonuc_ms?.trim() || "*"}`
                  : "⚽ Skor"}
              </button>
              {showScoreBox && (
                <div className="absolute right-0 top-full mt-1 z-[90] w-[min(320px,calc(100vw-12px))] bg-white border border-gray-300 rounded-lg shadow-2xl p-3 text-xs">
                  <div className="font-semibold text-gray-800 mb-2">Skor Filtresi</div>
                  <div className="flex items-end gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] text-gray-600 mb-0.5">İlk Yarı</label>
                      <input
                        value={scoreIy}
                        onChange={(e) => setScoreIy(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { applyScoreCombo(scoreIy, scoreMs); setShowScoreBox(false); } }}
                        placeholder="örn. 1-0"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:border-emerald-500 outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] text-gray-600 mb-0.5">Maç Sonu</label>
                      <input
                        value={scoreMs}
                        onChange={(e) => setScoreMs(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { applyScoreCombo(scoreIy, scoreMs); setShowScoreBox(false); } }}
                        placeholder="örn. 3-0"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1.5 mb-2">
                    <button
                      type="button"
                      onClick={() => { applyScoreCombo(scoreIy, scoreMs); setShowScoreBox(false); }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded font-medium">
                      Uygula
                    </button>
                    <button
                      type="button"
                      onClick={() => { setScoreIy(""); setScoreMs(""); applyScoreCombo("", ""); setShowScoreBox(false); }}
                      className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 px-2 py-1 rounded"
                      title="İY ve MS skor filtrelerini temizle">
                      Temizle
                    </button>
                  </div>
                  <div className="text-[10px] text-gray-500 mb-1">
                    Boş bırak = o alan serbest. Yıldız (*) wildcard: <span className="font-mono">1-*</span> → ilk yarısı 1 ile başlayan tüm maçlar.
                  </div>
                  {scoreRecent.length > 0 && (
                    <div className="border-t border-gray-200 pt-2 mt-1">
                      <div className="text-[10px] text-gray-600 mb-1">Son kullanılanlar:</div>
                      <div className="flex flex-wrap gap-1">
                        {scoreRecent.map((s, i) => (
                          <button
                            key={`${s.iy}|${s.ms}|${i}`}
                            type="button"
                            onClick={() => { setScoreIy(s.iy); setScoreMs(s.ms); applyScoreCombo(s.iy, s.ms); setShowScoreBox(false); }}
                            className="font-mono text-[11px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded">
                            {s.iy || "*"} / {s.ms || "*"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowEslestirme(true)}
              title="Eşleştirme Paneli: kod son 2/3/4 kombinasyonlarına göre tekrar/benzersiz analizi"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs px-3 py-1.5 rounded transition font-semibold whitespace-nowrap shadow-sm">
              🎯 Eşleştirme
            </button>
            <button onClick={() => setShowColPanel((v) => !v)}
              className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 text-xs px-3 py-1.5 rounded transition font-medium whitespace-nowrap">
              ☰ Sütunlar ({visibleIds.size})
            </button>

            {showColPanel && (
              <div className="absolute right-0 top-full mt-1 z-[100] w-[min(620px,calc(100vw-12px))] max-w-[calc(100vw-12px)] max-h-[80vh] overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-2xl p-3">

                {/* ── Araç çubuğu ── */}
                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-700">
                  <button onClick={selectAll} className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded">Hepsini Seç</button>
                  <button onClick={resetCols} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-900 px-2 py-1 rounded border border-gray-300">Varsayılan</button>
                  <button onClick={hideAll}   className="text-xs bg-red-900/60 hover:bg-red-800/60 px-2 py-1 rounded">Hepsini Gizle</button>
                  <span className="text-xs text-gray-700 self-center ml-auto">{visibleIds.size} / {mergedCols.length}</span>
                </div>

                {/* ── GÖRÜNÜM KAYDET / YÜKLE (tam filtre + düzen) ── */}
                <div className="mb-3 pb-3 border-b border-gray-700">
                  <p className="text-[11px] text-gray-800 mb-1 font-semibold uppercase tracking-wide">Görünüm Kaydet</p>
                  <p className="text-[10px] text-gray-600 mb-1.5">Tüm filtreler, sütunlar, sıralama ve hane seçimleri birlikte kaydedilir.</p>
                  <div className="flex gap-1.5 items-center mb-2">
                    <input
                      value={viewPresetInput}
                      onChange={(e) => setViewPresetInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const name = viewPresetInput.trim();
                          if (!name) return;
                          const preset: ViewPreset = {
                            name,
                            createdAt: new Date().toISOString(),
                            visibleIds: Array.from(visibleIds),
                            colOrder,
                            colWidths,
                            colClickPos,
                            topFilters: { ...filters },
                            colFilters: { ...colFiltersCommitted },
                            bidirFilters: { ...bidirFilters },
                            sortCol,
                            sortDir,
                            kodSon4: "",
                            kodSuffixN: DEFAULT_KOD_ROW_SUFFIX_N,
                            kodSuffixRefKey: DEFAULT_KOD_ROW_SUFFIX_REF,
                          };
                          const updated = [preset, ...viewPresets.filter((v) => v.name !== name)];
                          setViewPresets(updated);
                          lsSet(LS_VIEW_PRESETS, updated);
                          setViewPresetInput("");
                          setViewSaveMsg(`"${name}" kaydedildi`);
                          setTimeout(() => setViewSaveMsg(""), 2500);
                        }
                      }}
                      placeholder="Görünüm adı… (Enter ile kaydet)"
                      className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const name = viewPresetInput.trim();
                        if (!name) return;
                        const preset: ViewPreset = {
                          name,
                          createdAt: new Date().toISOString(),
                          visibleIds: Array.from(visibleIds),
                          colOrder,
                          colWidths,
                          colClickPos,
                          topFilters: { ...filters },
                          colFilters: { ...colFiltersCommitted },
                          bidirFilters: { ...bidirFilters },
                          sortCol,
                          sortDir,
                          kodSon4: "",
                          kodSuffixN: DEFAULT_KOD_ROW_SUFFIX_N,
                          kodSuffixRefKey: DEFAULT_KOD_ROW_SUFFIX_REF,
                        };
                        const updated = [preset, ...viewPresets.filter((v) => v.name !== name)];
                        setViewPresets(updated);
                        lsSet(LS_VIEW_PRESETS, updated);
                        setViewPresetInput("");
                        setViewSaveMsg(`"${name}" kaydedildi`);
                        setTimeout(() => setViewSaveMsg(""), 2500);
                      }}
                      className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium transition whitespace-nowrap">
                      {"\uD83D\uDCBE"} Kaydet
                    </button>
                    {viewSaveMsg && <span className="text-xs text-green-600">{viewSaveMsg}</span>}
                  </div>
                  {viewPresets.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {viewPresets.map((vp) => (
                        <div key={vp.name} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-blue-900 truncate block">{vp.name}</span>
                            <span className="text-[10px] text-gray-500">
                              {new Date(vp.createdAt).toLocaleDateString("tr-TR")} ·{" "}
                              {Object.values(vp.colFilters).filter(Boolean).length} sütun filtresi
                            </span>
                          </div>
                          <button
                            type="button"
                            title="Bu görünümü yükle"
                            onClick={() => {
                              setVisibleIds(new Set(vp.visibleIds));
                              setColOrder(vp.colOrder);
                              setColWidths(vp.colWidths);
                              setColClickPos(vp.colClickPos);
                              setFilters({ ...EMPTY_TOP, ...vp.topFilters });
                              setApplied({ ...EMPTY_TOP, ...vp.topFilters });
                              setColFilters(vp.colFilters);
                              commitColFilters(vp.colFilters);
                              if (vp.bidirFilters) setBidirFilters(normalizeBidirFromUnknown(vp.bidirFilters));
                              setSortCol(vp.sortCol);
                              setSortDir(vp.sortDir);
                              setPage(1);
                              setShowColPanel(false);
                            }}
                            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded transition whitespace-nowrap">
                            {"\uD83D\uDCC2"} Yükle
                          </button>
                          <button
                            type="button"
                            title="Sil"
                            onClick={() => {
                              const updated = viewPresets.filter((v) => v.name !== vp.name);
                              setViewPresets(updated);
                              lsSet(LS_VIEW_PRESETS, updated);
                            }}
                            className="text-gray-500 hover:text-red-500 transition text-xs px-1">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── PRESET KAYDET / YÜKLE (yalnızca sütun seçimi) ── */}
                <div className="mb-3 pb-3 border-b border-gray-700">
                  <p className="text-[11px] text-gray-800 mb-1.5 font-semibold uppercase tracking-wide">Sütun Düzenini Kaydet</p>
                  <div className="flex gap-1.5 items-center mb-2">
                    <input
                      value={presetInput}
                      onChange={(e) => setPresetInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveColPreset(); }}
                      placeholder="Preset adı… (örn: Temel görünüm)"
                      className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                    <button onClick={saveColPreset}
                      className="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition whitespace-nowrap">
                      💾 Kaydet
                    </button>
                    {saveMsg && <span className="text-xs text-green-400">{saveMsg}</span>}
                  </div>

                  {/* Kayıtlı presetler */}
                  {colPresets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {colPresets.map((p) => (
                        <div key={p.name} className="flex items-center gap-1 bg-gray-100 border border-gray-300 rounded px-2 py-1">
                          <button onClick={() => loadColPreset(p)} className="text-xs text-blue-300 hover:text-blue-200 transition">
                            📂 {p.name}
                          </button>
                          <button onClick={() => deleteColPreset(p.name)} className="text-gray-500 hover:text-red-400 transition ml-1 text-xs">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Sütun grupları ── */}
                {groups.map((grp) => {
                  const cols = mergedCols.filter((c) => c.group === grp);
                  const onCount = cols.filter((c) => visibleIds.has(c.id)).length;
                  const color = GROUP_COLORS[grp] ?? "bg-gray-200";
                  return (
                    <div key={grp} className="mb-3">
                      <button onClick={() => toggleGroup(grp)}
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${color} w-full text-left mb-1`}>
                        {grp} <span className="text-gray-700 font-normal">({onCount}/{cols.length})</span>
                      </button>
                      <div className="flex flex-wrap gap-1 pl-1">
                        {cols.map((c) => (
                          <button key={c.id} onClick={() => toggleCol(c.id)}
                            className={`text-[11px] px-2 py-0.5 rounded transition font-medium ${colPanelChipClass(c.id, visibleIds.has(c.id))}`}>
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Çift Yönlü (⇄) Arama Satırı ── */}
        {showBidirRow && (
          <div
            className="min-w-0 overflow-visible border-t border-blue-200 bg-blue-50"
            title="Öneri listeleri taşmasın: bu şerit overflow ile kırpılmaz; dar ekranda satırlar alta kayar (flex-wrap).">
            {/* overflow-x-auto burada öneri dropdown’larını kırpar; kaldırıldı. */}
          <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs min-w-0">
            <span className="font-semibold text-blue-700 shrink-0">⇄</span>

            {/* ── Referans Maç ── */}
            <div className="flex items-center gap-1 border-r border-blue-200 pr-2 mr-1" ref={refMatchDropdownRef}>
              <span className="text-blue-700 font-semibold shrink-0">Ref</span>

              {/* Alan seçici */}
              <div className="flex rounded overflow-hidden border border-gray-300">
                {REF_MATCH_FIELDS.map((f) => (
                  <button key={f.key} type="button" title={f.title}
                    onClick={() => setRefMatch((prev) => ({ ...prev, field: f.key }))}
                    className={`px-1.5 py-0.5 text-[10px] font-medium transition ${refMatch.field === f.key ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-blue-50"}`}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Arama kutusu */}
              <div className="relative">
                <input
                  value={refMatch.query}
                  onChange={(e) => {
                    const q = e.target.value;
                    setRefMatch((prev) => ({ ...prev, query: q, selected: q ? prev.selected : null }));
                    if (refMatchTimerRef.current) clearTimeout(refMatchTimerRef.current);
                    refMatchTimerRef.current = setTimeout(() => searchRefMatches(q), 350);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setRefMatch((prev) => ({ ...prev, query: "", selected: null, results: [], isOpen: false }));
                    }
                  }}
                  onFocus={() => { if (refMatch.results.length) setRefMatch((prev) => ({ ...prev, isOpen: true })); }}
                  placeholder={refMatch.selected ? "" : "Takım adı / maç ID…"}
                  className={`w-44 min-w-[11rem] bg-white border rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-blue-500 ${refMatch.selected ? "border-blue-500" : "border-gray-300"}`}
                />
                {/* Seçili maç özeti (kutu dar → truncate; tam metin title) */}
                {refMatch.selected && !refMatch.query && (
                  <span
                    className="absolute inset-0 flex items-center px-1.5 text-[10px] text-blue-700 font-medium pointer-events-none truncate"
                    title={`${String(refMatch.selected["id"])} · ${String(refMatch.selected["t1"] ?? "")} – ${String(refMatch.selected["t2"] ?? "")}`}>
                    {String(refMatch.selected["id"] ?? "")} · {String(refMatch.selected["t1"] ?? "")} – {String(refMatch.selected["t2"] ?? "")}
                  </span>
                )}
                {/* Dropdown */}
                {refMatch.isOpen && (
                  <div className="absolute left-0 top-full mt-0.5 z-[200] w-72 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg">
                    {refMatch.loading && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-500">Aranıyor…</div>
                    )}
                    {!refMatch.loading && refMatch.results.length === 0 && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-400">Sonuç yok</div>
                    )}
                    {refMatch.results.map((m, i) => (
                      <button key={i} type="button"
                        className="w-full text-left px-2 py-1 text-[11px] hover:bg-blue-50 transition truncate border-b border-gray-100"
                        onClick={() => {
                          setRefMatch((prev) => ({ ...prev, selected: m, query: "", isOpen: false, results: [] }));
                          applyRefToBidir(m, refMatch.field, refMatch.positions);
                        }}>
                        <span className="font-mono text-gray-500 mr-1">{String(m["id"])}</span>
                        <span className="text-gray-800">{String(m["t1"] ?? "")} – {String(m["t2"] ?? "")}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pozisyon seçici — seçili maç varsa göster */}
              {refMatch.selected && (() => {
                const rawVal = String(refMatch.selected[refMatch.field] ?? "").replace(/\D/g, "");
                if (!rawVal) return null;
            return (
                  <div className="flex items-center gap-0.5">
                    <span className="text-gray-500 text-[10px]">Hane:</span>
                    {rawVal.split("").map((ch, i) => {
                      const pos = i + 1;
                      const isSel = refMatch.positions.includes(pos);
                      return (
                        <button key={pos} type="button"
                          title={`${DIGIT_POS_LABEL[pos] ?? pos}. hane = ${ch}`}
                          onClick={() => {
                            setRefMatch((prev) => {
                              const next = isSel
                                ? prev.positions.filter((p) => p !== pos)
                                : [...prev.positions, pos].sort((a, b) => a - b);
                              applyRefToBidir(prev.selected!, prev.field, next);
                              return { ...prev, positions: next };
                            });
                          }}
                          className={`w-[18px] h-[18px] text-[9px] flex items-center justify-center rounded border font-bold transition ${isSel ? "bg-blue-600 border-blue-700 text-white" : "bg-white border-gray-400 text-gray-600 hover:bg-blue-100"}`}>
                          {DIGIT_POS_LABEL[pos] ?? pos}
              </button>
            );
          })}
                    <span className="text-[10px] font-mono text-blue-700 ml-1">
                      = {buildRefPattern(refMatch.selected, refMatch.field, refMatch.positions)}
                    </span>
        </div>
                );
              })()}

              {refMatch.selected && (
                <button type="button" title="Referans maçı temizle"
                  onClick={() => {
                    setRefMatch(REF_MATCH_INIT);
                    setBidirFilters((prev) => ({
                      ...prev,
                      takimid: BIDIR_INIT.takimid,
                    }));
                    setPage(1);
                  }}
                  className="text-gray-500 hover:text-red-600 px-0.5">×</button>
              )}
            </div>

            {/* Takım adı — ev / dep ayrı; yazdıkça maç önerisi (Ref ile aynı API) */}
            <div
              className="flex items-center gap-1 flex-wrap"
              title="Yazarken yalnız öneri listesi güncellenir; tablo listesi takım seçince veya Enter ile uygular. T-ID kutuları: alan dışına çıkınca da uygulanır.">
              <span className="text-gray-600 shrink-0">Takım</span>
              <div
                className="relative flex items-center gap-0.5 rounded border border-gray-300 bg-white px-0.5"
                ref={takimEvDropdownRef}>
                <span className="text-[9px] text-gray-500 pl-0.5 shrink-0">Ev</span>
                <input
                  value={bidirFilters.takim.ev.pattern}
                  onChange={(e) => {
                    const q = e.target.value;
                    setBidirFilters((prev) => ({
                      ...prev,
                      takim: { ...prev.takim, ev: { ...prev.takim.ev, pattern: q } },
                    }));
                    if (takimEvTimerRef.current) clearTimeout(takimEvTimerRef.current);
                    takimEvTimerRef.current = setTimeout(() => searchTakimSuggest(q, "ev"), 350);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setTakimSuggestEv(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        takim: { ...prev.takim, ev: { ...prev.takim.ev, committed: prev.takim.ev.pattern } },
                      }));
                      setPage(1);
                    } else if (e.key === "Escape") {
                      setTakimSuggestEv(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        takim: { ...prev.takim, ev: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }
                  }}
                  onFocus={() => {
                    if (takimSuggestEv.teamNames.length) setTakimSuggestEv((prev) => ({ ...prev, open: true }));
                  }}
                  placeholder="Ara…"
                  className={`w-[5.5rem] min-w-[4.5rem] border-0 rounded py-0.5 text-[11px] focus:outline-none focus:ring-0 ${
                    bidirFilters.takim.ev.committed ? "text-blue-800 font-medium" : "text-gray-900"
                  }`}
                />
                {(bidirFilters.takim.ev.pattern || bidirFilters.takim.ev.committed) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTakimSuggestEv(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        takim: { ...prev.takim, ev: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }}
                    className="text-gray-400 hover:text-gray-800 px-0.5 text-[11px]"
                    title="Ev temizle">
                    ×
                  </button>
                )}
                {takimSuggestEv.open && (
                  <div
                    className="absolute left-0 top-full mt-0.5 z-[200] w-72 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg"
                    onMouseDown={(e) => e.preventDefault()}>
                    {takimSuggestEv.loading && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-500">Aranıyor…</div>
                    )}
                    {!takimSuggestEv.loading && takimSuggestEv.teamNames.length === 0 && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-400">Sonuç yok</div>
                    )}
                    {!takimSuggestEv.loading &&
                      takimSuggestEv.teamNames.map((name, i) => (
                        <button
                          key={`ev-${i}-${name}`}
                          type="button"
                          className="w-full text-left px-2 py-1 text-[11px] hover:bg-blue-50 transition truncate border-b border-gray-100"
                          onClick={() => {
                            setTakimSuggestEv(TAKIM_SUGGEST_INIT);
                            setBidirFilters((prev) => ({
                              ...prev,
                              takim: {
                                ...prev.takim,
                                ev: { pattern: name, committed: name },
                              },
                            }));
                            setPage(1);
                          }}>
                          <span className="text-gray-800">{name}</span>
                        </button>
                      ))}
          </div>
        )}
              </div>
              <div
                className="relative flex items-center gap-0.5 rounded border border-gray-300 bg-white px-0.5"
                ref={takimDepDropdownRef}>
                <span className="text-[9px] text-gray-500 pl-0.5 shrink-0">Dep</span>
                <input
                  value={bidirFilters.takim.dep.pattern}
                  onChange={(e) => {
                    const q = e.target.value;
                    setBidirFilters((prev) => ({
                      ...prev,
                      takim: { ...prev.takim, dep: { ...prev.takim.dep, pattern: q } },
                    }));
                    if (takimDepTimerRef.current) clearTimeout(takimDepTimerRef.current);
                    takimDepTimerRef.current = setTimeout(() => searchTakimSuggest(q, "dep"), 350);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setTakimSuggestDep(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        takim: { ...prev.takim, dep: { ...prev.takim.dep, committed: prev.takim.dep.pattern } },
                      }));
                      setPage(1);
                    } else if (e.key === "Escape") {
                      setTakimSuggestDep(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        takim: { ...prev.takim, dep: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }
                  }}
                  onFocus={() => {
                    if (takimSuggestDep.teamNames.length) setTakimSuggestDep((prev) => ({ ...prev, open: true }));
                  }}
                  placeholder="Ara…"
                  className={`w-[5.5rem] min-w-[4.5rem] border-0 rounded py-0.5 text-[11px] focus:outline-none focus:ring-0 ${
                    bidirFilters.takim.dep.committed ? "text-blue-800 font-medium" : "text-gray-900"
                  }`}
                />
                {(bidirFilters.takim.dep.pattern || bidirFilters.takim.dep.committed) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTakimSuggestDep(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        takim: { ...prev.takim, dep: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }}
                    className="text-gray-400 hover:text-gray-800 px-0.5 text-[11px]"
                    title="Dep temizle">
                    ×
                  </button>
                )}
                {takimSuggestDep.open && (
                  <div
                    className="absolute left-0 top-full mt-0.5 z-[200] w-72 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg"
                    onMouseDown={(e) => e.preventDefault()}>
                    {takimSuggestDep.loading && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-500">Aranıyor…</div>
                    )}
                    {!takimSuggestDep.loading && takimSuggestDep.teamNames.length === 0 && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-400">Sonuç yok</div>
                    )}
                    {!takimSuggestDep.loading &&
                      takimSuggestDep.teamNames.map((name, i) => (
                        <button
                          key={`dep-${i}-${name}`}
                          type="button"
                          className="w-full text-left px-2 py-1 text-[11px] hover:bg-blue-50 transition truncate border-b border-gray-100"
                          onClick={() => {
                            setTakimSuggestDep(TAKIM_SUGGEST_INIT);
                            setBidirFilters((prev) => ({
                              ...prev,
                              takim: {
                                ...prev.takim,
                                dep: { pattern: name, committed: name },
                              },
                            }));
                            setPage(1);
                          }}>
                          <span className="text-gray-800">{name}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Takım ID — ev / dep ayrı (t1i / t2i) */}
            <div className="flex items-center gap-1 flex-wrap" title="Ev: t1i. Dep: t2i. İkisi: her iki ID şartı (VE).">
              <span className="text-gray-600 shrink-0">T-ID</span>
              <div className="flex items-center gap-0.5 rounded border border-gray-300 bg-white px-0.5">
                <span className="text-[9px] text-gray-500 pl-0.5 shrink-0">Ev</span>
                <input
                  value={bidirFilters.takimid.ev.pattern}
                  onChange={(e) =>
                    setBidirFilters((prev) => ({
                      ...prev,
                      takimid: { ...prev.takimid, ev: { ...prev.takimid.ev, pattern: e.target.value } },
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setBidirFilters((prev) => ({
                        ...prev,
                        takimid: { ...prev.takimid, ev: { ...prev.takimid.ev, committed: prev.takimid.ev.pattern } },
                      }));
                      setPage(1);
                    } else if (e.key === "Escape") {
                      setBidirFilters((prev) => ({
                        ...prev,
                        takimid: { ...prev.takimid, ev: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }
                  }}
                  onBlur={() => commitBidirLaneOnBlur("takimid", "ev")}
                  placeholder="1305…"
                  className={`w-16 min-w-[3.25rem] border-0 rounded py-0.5 text-[11px] focus:outline-none focus:ring-0 ${
                    bidirFilters.takimid.ev.committed ? "text-blue-800 font-medium" : "text-gray-900"
                  }`}
                />
                {(bidirFilters.takimid.ev.pattern || bidirFilters.takimid.ev.committed) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBidirFilters((prev) => ({
                        ...prev,
                        takimid: { ...prev.takimid, ev: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }}
                    className="text-gray-400 hover:text-gray-800 px-0.5 text-[11px]"
                    title="Ev T-ID temizle">
                    ×
                  </button>
                )}
              </div>
              <div className="flex items-center gap-0.5 rounded border border-gray-300 bg-white px-0.5">
                <span className="text-[9px] text-gray-500 pl-0.5 shrink-0">Dep</span>
                <input
                  value={bidirFilters.takimid.dep.pattern}
                  onChange={(e) =>
                    setBidirFilters((prev) => ({
                      ...prev,
                      takimid: { ...prev.takimid, dep: { ...prev.takimid.dep, pattern: e.target.value } },
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setBidirFilters((prev) => ({
                        ...prev,
                        takimid: { ...prev.takimid, dep: { ...prev.takimid.dep, committed: prev.takimid.dep.pattern } },
                      }));
                      setPage(1);
                    } else if (e.key === "Escape") {
                      setBidirFilters((prev) => ({
                        ...prev,
                        takimid: { ...prev.takimid, dep: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }
                  }}
                  onBlur={() => commitBidirLaneOnBlur("takimid", "dep")}
                  placeholder="2793…"
                  className={`w-16 min-w-[3.25rem] border-0 rounded py-0.5 text-[11px] focus:outline-none focus:ring-0 ${
                    bidirFilters.takimid.dep.committed ? "text-blue-800 font-medium" : "text-gray-900"
                  }`}
                />
                {(bidirFilters.takimid.dep.pattern || bidirFilters.takimid.dep.committed) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBidirFilters((prev) => ({
                        ...prev,
                        takimid: { ...prev.takimid, dep: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }}
                    className="text-gray-400 hover:text-gray-800 px-0.5 text-[11px]"
                    title="Dep T-ID temizle">
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Personel — hakem; ev / dep TD ayrı; Ev+Dep OR kutusu; yazarken öneri, tablo seçim veya Enter ile */}
            <div
              className="flex items-center gap-1 flex-wrap"
              title="Hk: hakem. Ev TD / Dep TD: ilgili sütun. Ev+Dep: ev veya dep TD’de eşleşme (OR; diğer dolu kutularla VE). Yazarken yalnız öneri; listeden seçince veya Enter ile uygular.">
              <span className="text-gray-600 shrink-0">Personel</span>
              <div
                className="relative flex items-center gap-0.5 rounded border border-gray-300 bg-white px-0.5"
                ref={personelHakemDropdownRef}>
                <span className="text-[9px] text-gray-500 pl-0.5 shrink-0" title="Hakem">
                  Hk
                </span>
                <input
                  value={bidirFilters.personel.hakem.pattern}
                  onChange={(e) => {
                    const q = e.target.value;
                    setBidirFilters((prev) => ({
                      ...prev,
                      personel: { ...prev.personel, hakem: { ...prev.personel.hakem, pattern: q } },
                    }));
                    if (personelHakemTimerRef.current) clearTimeout(personelHakemTimerRef.current);
                    personelHakemTimerRef.current = setTimeout(() => searchPersonelSuggest(q, "hakem"), 350);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPersonelSuggestHakem(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        personel: {
                          ...prev.personel,
                          hakem: { ...prev.personel.hakem, committed: prev.personel.hakem.pattern },
                        },
                      }));
                      setPage(1);
                    } else if (e.key === "Escape") {
                      setPersonelSuggestHakem(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        personel: { ...prev.personel, hakem: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }
                  }}
                  onFocus={() => {
                    if (personelSuggestHakem.teamNames.length) {
                      setPersonelSuggestHakem((prev) => ({ ...prev, open: true }));
                    }
                  }}
                  placeholder="Hakem…"
                  className={`w-[5.5rem] min-w-[4.5rem] border-0 rounded py-0.5 text-[11px] focus:outline-none focus:ring-0 ${
                    bidirFilters.personel.hakem.committed ? "text-blue-800 font-medium" : "text-gray-900"
                  }`}
                />
                {(bidirFilters.personel.hakem.pattern || bidirFilters.personel.hakem.committed) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPersonelSuggestHakem(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        personel: { ...prev.personel, hakem: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }}
                    className="text-gray-400 hover:text-gray-800 px-0.5 text-[11px]"
                    title="Hakem temizle">
                    ×
                  </button>
                )}
                {personelSuggestHakem.open && (
                  <div
                    className="absolute left-0 top-full mt-0.5 z-[200] w-72 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg"
                    onMouseDown={(e) => e.preventDefault()}>
                    {personelSuggestHakem.loading && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-500">Aranıyor…</div>
                    )}
                    {!personelSuggestHakem.loading && personelSuggestHakem.teamNames.length === 0 && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-400">Sonuç yok</div>
                    )}
                    {!personelSuggestHakem.loading &&
                      personelSuggestHakem.teamNames.map((name, i) => (
                        <button
                          key={`hk-${i}-${name}`}
                          type="button"
                          className="w-full text-left px-2 py-1 text-[11px] hover:bg-blue-50 transition truncate border-b border-gray-100"
                          onClick={() => {
                            setPersonelSuggestHakem(TAKIM_SUGGEST_INIT);
                            setBidirFilters((prev) => ({
                              ...prev,
                              personel: {
                                ...prev.personel,
                                hakem: { pattern: name, committed: name },
                              },
                            }));
                            setPage(1);
                          }}>
                          <span className="text-gray-800">{name}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div
                className="relative flex items-center gap-0.5 rounded border border-gray-300 bg-white px-0.5"
                ref={personelAntEvDropdownRef}>
                <span className="text-[9px] text-gray-500 pl-0.5 shrink-0" title="Ev teknik direktör (t1_antrenor)">
                  Ev TD
                </span>
                <input
                  value={bidirFilters.personel.antEv.pattern}
                  onChange={(e) => {
                    const q = e.target.value;
                    setBidirFilters((prev) => ({
                      ...prev,
                      personel: { ...prev.personel, antEv: { ...prev.personel.antEv, pattern: q } },
                    }));
                    if (personelAntEvTimerRef.current) clearTimeout(personelAntEvTimerRef.current);
                    personelAntEvTimerRef.current = setTimeout(() => searchPersonelSuggest(q, "t1_antrenor"), 350);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPersonelSuggestAntEv(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        personel: {
                          ...prev.personel,
                          antEv: { ...prev.personel.antEv, committed: prev.personel.antEv.pattern },
                        },
                      }));
                      setPage(1);
                    } else if (e.key === "Escape") {
                      setPersonelSuggestAntEv(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        personel: { ...prev.personel, antEv: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }
                  }}
                  onFocus={() => {
                    if (personelSuggestAntEv.teamNames.length) {
                      setPersonelSuggestAntEv((prev) => ({ ...prev, open: true }));
                    }
                  }}
                  placeholder="Ev TD…"
                  className={`w-[5.5rem] min-w-[4.5rem] border-0 rounded py-0.5 text-[11px] focus:outline-none focus:ring-0 ${
                    bidirFilters.personel.antEv.committed ? "text-blue-800 font-medium" : "text-gray-900"
                  }`}
                />
                {(bidirFilters.personel.antEv.pattern || bidirFilters.personel.antEv.committed) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPersonelSuggestAntEv(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        personel: { ...prev.personel, antEv: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }}
                    className="text-gray-400 hover:text-gray-800 px-0.5 text-[11px]"
                    title="Ev TD temizle">
                    ×
                  </button>
                )}
                {personelSuggestAntEv.open && (
                  <div
                    className="absolute left-0 top-full mt-0.5 z-[200] w-72 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg"
                    onMouseDown={(e) => e.preventDefault()}>
                    {personelSuggestAntEv.loading && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-500">Aranıyor…</div>
                    )}
                    {!personelSuggestAntEv.loading && personelSuggestAntEv.teamNames.length === 0 && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-400">Sonuç yok</div>
                    )}
                    {!personelSuggestAntEv.loading &&
                      personelSuggestAntEv.teamNames.map((name, i) => (
                        <button
                          key={`ant1-${i}-${name}`}
                          type="button"
                          className="w-full text-left px-2 py-1 text-[11px] hover:bg-blue-50 transition truncate border-b border-gray-100"
                          onClick={() => {
                            setPersonelSuggestAntEv(TAKIM_SUGGEST_INIT);
                            setBidirFilters((prev) => ({
                              ...prev,
                              personel: {
                                ...prev.personel,
                                antEv: { pattern: name, committed: name },
                              },
                            }));
                            setPage(1);
                          }}>
                          <span className="text-gray-800">{name}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div
                className="relative flex items-center gap-0.5 rounded border border-gray-300 bg-white px-0.5"
                ref={personelAntDepDropdownRef}>
                <span className="text-[9px] text-gray-500 pl-0.5 shrink-0" title="Deplasman teknik direktör (t2_antrenor)">
                  Dep TD
                </span>
                <input
                  value={bidirFilters.personel.antDep.pattern}
                  onChange={(e) => {
                    const q = e.target.value;
                    setBidirFilters((prev) => ({
                      ...prev,
                      personel: { ...prev.personel, antDep: { ...prev.personel.antDep, pattern: q } },
                    }));
                    if (personelAntDepTimerRef.current) clearTimeout(personelAntDepTimerRef.current);
                    personelAntDepTimerRef.current = setTimeout(() => searchPersonelSuggest(q, "t2_antrenor"), 350);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPersonelSuggestAntDep(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        personel: {
                          ...prev.personel,
                          antDep: { ...prev.personel.antDep, committed: prev.personel.antDep.pattern },
                        },
                      }));
                      setPage(1);
                    } else if (e.key === "Escape") {
                      setPersonelSuggestAntDep(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        personel: { ...prev.personel, antDep: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }
                  }}
                  onFocus={() => {
                    if (personelSuggestAntDep.teamNames.length) {
                      setPersonelSuggestAntDep((prev) => ({ ...prev, open: true }));
                    }
                  }}
                  placeholder="Dep TD…"
                  className={`w-[5.5rem] min-w-[4.5rem] border-0 rounded py-0.5 text-[11px] focus:outline-none focus:ring-0 ${
                    bidirFilters.personel.antDep.committed ? "text-blue-800 font-medium" : "text-gray-900"
                  }`}
                />
                {(bidirFilters.personel.antDep.pattern || bidirFilters.personel.antDep.committed) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPersonelSuggestAntDep(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        personel: { ...prev.personel, antDep: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }}
                    className="text-gray-400 hover:text-gray-800 px-0.5 text-[11px]"
                    title="Dep TD temizle">
                    ×
                  </button>
                )}
                {personelSuggestAntDep.open && (
                  <div
                    className="absolute left-0 top-full mt-0.5 z-[200] w-72 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg"
                    onMouseDown={(e) => e.preventDefault()}>
                    {personelSuggestAntDep.loading && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-500">Aranıyor…</div>
                    )}
                    {!personelSuggestAntDep.loading && personelSuggestAntDep.teamNames.length === 0 && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-400">Sonuç yok</div>
                    )}
                    {!personelSuggestAntDep.loading &&
                      personelSuggestAntDep.teamNames.map((name, i) => (
                        <button
                          key={`ant2-${i}-${name}`}
                          type="button"
                          className="w-full text-left px-2 py-1 text-[11px] hover:bg-blue-50 transition truncate border-b border-gray-100"
                          onClick={() => {
                            setPersonelSuggestAntDep(TAKIM_SUGGEST_INIT);
                            setBidirFilters((prev) => ({
                              ...prev,
                              personel: {
                                ...prev.personel,
                                antDep: { pattern: name, committed: name },
                              },
                            }));
                            setPage(1);
                          }}>
                          <span className="text-gray-800">{name}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div
                className="relative flex items-center gap-0.5 rounded border border-gray-300 bg-white px-0.5"
                ref={personelAntHerDropdownRef}>
                <span
                  className="text-[9px] text-gray-500 pl-0.5 shrink-0"
                  title="Ev veya dep teknik direktör (t1_antrenor | t2_antrenor, OR)">
                  Ev+Dep
                </span>
                <input
                  value={bidirFilters.personel.antHer.pattern}
                  onChange={(e) => {
                    const q = e.target.value;
                    setBidirFilters((prev) => ({
                      ...prev,
                      personel: { ...prev.personel, antHer: { ...prev.personel.antHer, pattern: q } },
                    }));
                    if (personelAntHerTimerRef.current) clearTimeout(personelAntHerTimerRef.current);
                    personelAntHerTimerRef.current = setTimeout(() => searchPersonelSuggest(q, "ant_ev_veya_dep"), 350);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPersonelSuggestAntHer(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        personel: {
                          ...prev.personel,
                          antHer: { ...prev.personel.antHer, committed: prev.personel.antHer.pattern },
                        },
                      }));
                      setPage(1);
                    } else if (e.key === "Escape") {
                      setPersonelSuggestAntHer(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        personel: { ...prev.personel, antHer: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }
                  }}
                  onFocus={() => {
                    if (personelSuggestAntHer.teamNames.length) {
                      setPersonelSuggestAntHer((prev) => ({ ...prev, open: true }));
                    }
                  }}
                  placeholder="Ev veya dep TD…"
                  className={`w-[6.25rem] min-w-[4.75rem] border-0 rounded py-0.5 text-[11px] focus:outline-none focus:ring-0 ${
                    bidirFilters.personel.antHer.committed ? "text-blue-800 font-medium" : "text-gray-900"
                  }`}
                />
                {(bidirFilters.personel.antHer.pattern || bidirFilters.personel.antHer.committed) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPersonelSuggestAntHer(TAKIM_SUGGEST_INIT);
                      setBidirFilters((prev) => ({
                        ...prev,
                        personel: { ...prev.personel, antHer: { pattern: "", committed: "" } },
                      }));
                      setPage(1);
                    }}
                    className="text-gray-400 hover:text-gray-800 px-0.5 text-[11px]"
                    title="Ev+Dep TD temizle">
                    ×
                  </button>
                )}
                {personelSuggestAntHer.open && (
                  <div
                    className="absolute left-0 top-full mt-0.5 z-[200] w-72 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg"
                    onMouseDown={(e) => e.preventDefault()}>
                    {personelSuggestAntHer.loading && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-500">Aranıyor…</div>
                    )}
                    {!personelSuggestAntHer.loading && personelSuggestAntHer.teamNames.length === 0 && (
                      <div className="px-2 py-1.5 text-[11px] text-gray-400">Sonuç yok</div>
                    )}
                    {!personelSuggestAntHer.loading &&
                      personelSuggestAntHer.teamNames.map((name, i) => (
                        <button
                          key={`anth-${i}-${name}`}
                          type="button"
                          className="w-full text-left px-2 py-1 text-[11px] hover:bg-blue-50 transition truncate border-b border-gray-100"
                          onClick={() => {
                            setPersonelSuggestAntHer(TAKIM_SUGGEST_INIT);
                            setBidirFilters((prev) => ({
                              ...prev,
                              personel: {
                                ...prev.personel,
                                antHer: { pattern: name, committed: name },
                              },
                            }));
                            setPage(1);
                          }}>
                          <span className="text-gray-800">{name}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

      </header>

      {loadedSavedFilterName && (
        <div className="shrink-0 flex flex-wrap items-center gap-1.5 px-2 py-1.5 border-b border-slate-200 bg-slate-100 text-[11px] text-slate-800">
          <span className="text-slate-500 shrink-0">Kayıtlı filtre:</span>
          <span className="font-semibold truncate max-w-[12rem]" title={loadedSavedFilterName}>
            {loadedSavedFilterName}
          </span>
          <button
            type="button"
            className="shrink-0 px-1 py-0 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-600"
            title="Kayıtlı filtre şeridini kapat ve tüm liste filtrelerini sıfırla (üst şerit, sütun aramaları, maç odak vb.)"
            onClick={() => {
              resetAllListFiltersToDefault();
            }}
          >
            ✕
          </button>
          <span className="text-slate-300 shrink-0">|</span>
          <span className="text-slate-500 shrink-0">Oynanmamış maçlar</span>
          {pickerLoading ? (
            <span className="text-slate-400 italic">yükleniyor…</span>
          ) : pickerRows.length === 0 ? (
            <span className="text-amber-700">Bu filtreye uyan oynanmamış maç yok (veya 500 üstü — daraltın).</span>
          ) : (
            <>
              <label
                className="flex items-center gap-1 shrink-0 cursor-pointer select-none text-slate-600"
                title="Açıkken: seçilen maçın günü (tarih_from/to), saati (Saat sütunu) ve lig adı (üst Lig) otomatik yazılır. Kapatırsan yalnızca maç odak (cf_id) kalır.">
                <input
                  type="checkbox"
                  className="rounded border-slate-400"
                  checked={refAutoFillFromPicker}
                  onChange={(e) => setRefAutoFillFromPicker(e.target.checked)}
                />
                <span>Maça göre doldur</span>
              </label>
              <select
                className="min-w-0 max-w-[min(48rem,88vw)] flex-1 truncate text-[11px] border border-slate-300 rounded px-1 py-0.5 bg-white"
                value={pickerSelectedIndex === null ? "" : String(pickerSelectedIndex)}
                title="Önce — Maç seç —; sonra bir maç seçince tablo o maça odaklanır (cf_id). İşaretliyse tarih/saat/lig maça göre dolar."
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    clearPickerMatchFocus();
                    return;
                  }
                  const i = Number(raw);
                  if (!Number.isFinite(i) || !pickerRows[i]) return;
                  const row = pickerRows[i]!;
                  applyReferenceFieldsFromPickerRow(row);
                  setPickerSelectedIndex(i);
                  setFocusMatchId(String(row.id));
                  setPage(1);
                }}
              >
                <option value="">— Maç seç —</option>
                {pickerRows.map((r, i) => (
                  <option key={r.id} value={String(i)}>
                    {formatPickerOptionLabel(r)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="shrink-0 px-1.5 py-0 rounded border border-slate-300 bg-white hover:bg-slate-50"
                aria-label="Önceki maç"
                onClick={goPickerPrev}
              >
                ◀
              </button>
              <button
                type="button"
                className="shrink-0 px-1.5 py-0 rounded border border-slate-300 bg-white hover:bg-slate-50"
                aria-label="Sonraki maç"
                onClick={goPickerNext}
              >
                ▶
              </button>
              {(focusMatchId != null || pickerSelectedIndex != null) && (
                <button
                  type="button"
                  className="shrink-0 px-1.5 py-0 rounded border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                  title="Maç odaklamayı kapat; yalnızca kayıtlı filtre + liste (cf_id yok). Açılır liste — Maç seç — konumuna döner."
                  onClick={() => clearPickerMatchFocus()}
                >
                  Filtreye dön
                </button>
              )}
              {pickerPartial && (
                <span className="text-amber-800 text-[10px] shrink-0" title="En fazla 500 satır listelenir">
                  (ilk 500)
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Eşleştirme Paneli (modal) ── */}
      <EslestirmePaneli
        open={showEslestirme}
        onClose={() => setShowEslestirme(false)}
        currentScope={eslestirmeCurrentScope}
        onApplyIdList={applyEslestirmeIdList}
      />

      <SavedFiltersPanel
        open={showSavedFilters}
        onClose={() => setShowSavedFilters(false)}
        captureSnapshot={captureFilterSnapshot}
        onApplySnapshot={(payload, name) => {
          applyFilterSnapshot(payload, name);
          setLoadedSavedFilterName(name);
          setFocusMatchId(null);
        }}
      />

      <TaramaModu
        open={showTarama}
        onClose={() => setShowTarama(false)}
        matches={matches}
        total={total}
        canLoadMore={page < totalPages}
        loadingMore={loading}
        onLoadMore={() => setPage((p) => Math.min(p + 1, totalPages))}
        buildApiParams={buildMatchesApiParams}
      />

      {/* ── TABLO ── (z-0: üstteki header + Sütunlar paneli her zaman üstte; isolate: yükleme örtüsü thead üstünde) */}
      <div ref={tableScrollAreaRef} className="relative z-0 isolate flex-1 min-h-0 min-w-0 overflow-auto">
        <table
          className="text-sm border-collapse table-fixed max-w-none"
          style={{ width: tableScrollWidth, minWidth: tableScrollWidth }}
        >
          {/* colgroup: table-fixed'in her sütun için doğru genişliği kullanmasını sağlar.
              colSpan'lı grup başlık satırı olmadan tarayıcı genişlikleri yanlış hesaplar. */}
          <colgroup>
            <col style={{ width: 16, minWidth: 16, maxWidth: 16 }} />
            {visibleCols.map((c) => (
              <col key={c.id} style={{ width: colW(c), minWidth: colW(c) }} />
            ))}
          </colgroup>
          {/* z-[1]: yalnızca tablo gövdesinin üstünde kalsın; üstteki ⇄ öneri listeleri (z-[200]) ile yarışmasın */}
          <thead className="sticky top-0 z-[1]">
            <tr>
              <th className="w-4 min-w-4 max-w-4 border-r border-gray-400 bg-gray-200 align-middle py-1" />
              {groupSpans.map((gs, i) => (
                <th
                  key={i}
                  colSpan={gs.count}
                  className={`px-1.5 py-1.5 text-center text-xs font-semibold text-gray-900 border-b border-gray-400 border-r border-gray-400 leading-snug whitespace-normal break-words ${GROUP_COLORS[gs.group] ?? "bg-gray-200"}`}
                >
                  {gs.group}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-300">
              {/* boş hücre — ◉ buton sütunu */}
              <th className="w-4 min-w-4 max-w-4 border-r border-gray-400 align-top py-1" />
              {visibleCols.map((c) => (
                <th
                  key={c.id}
                  style={{ width: colW(c), minWidth: colW(c), maxWidth: colW(c) }}
                  className="relative px-1 py-1 text-left font-medium text-gray-900 border-b border-gray-400 border-r border-gray-400 select-none group align-top"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromId = e.dataTransfer.getData("text/plain");
                    if (!fromId || fromId === c.id) return;
                    setColOrder((prev) => reorderColOrder(mergedCols, visibleIds, prev, fromId, c.id));
                  }}
                >
                  <div className="flex items-start gap-0.5 pr-0.5">
                    <span
                      draggable
                      title="Sürükleyerek sırala"
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", c.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-800 px-0.5 -ml-0.5 shrink-0 text-[10px] leading-none mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {"\u22EE\u22EE"}
                    </span>
                    <button
                      type="button"
                      title={c.label}
                      className="flex min-w-0 flex-1 items-start gap-0.5 text-left font-semibold text-gray-900 hover:bg-gray-400/40 rounded px-0.5 -mx-0.5 cursor-pointer text-[11px] leading-snug"
                  onClick={() => handleSort(c.id)}
                    >
                      <span className="whitespace-normal break-words hyphens-auto text-center w-full">{c.label}</span>
                      {sortCol === c.id ? (
                        <span className="text-blue-700 text-[9px] shrink-0 leading-none mt-0.5">
                          {sortDir === "asc" ? " \u25B2" : " \u25BC"}
                  </span>
                      ) : (
                        <span className="text-gray-400 text-[9px] opacity-0 group-hover:opacity-100 shrink-0 leading-none mt-0.5">
                          {" \u21C5"}
                        </span>
                      )}
                    </button>
                  </div>
                  <div
                    role="separator"
                    title="Genişlet / daralt"
                    className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize hover:bg-blue-500/50"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      resizeRef.current = { id: c.id, startX: e.clientX, startW: colW(c) };
                    }}
                  />
                </th>
              ))}
            </tr>
            {/* ── Hane seçici satırı (gizlenebilir) ── */}
            {showDigitRow && (
              <tr className="bg-gray-50 border-b border-gray-300">
                {/* ◉ sütun başlığı — mod göstergesi */}
                <th
                  className="w-4 min-w-4 max-w-4 border-r border-gray-300 text-center align-middle cursor-pointer select-none"
                  title={
                    digitPosMode === "contains"
                      ? "≈ Herhangi yerde modu: hücre tıklanınca *09* gibi pattern üretilir. Tıkla: tam pozisyon moduna geç."
                      : "= Tam pozisyon modu: hücre tıklanınca ?09???? gibi pattern üretilir. Tıkla: herhangi yerde moduna geç."
                  }
                  onClick={() => setDigitPosMode((m) => m === "contains" ? "positional" : "contains")}
                >
                  <span className={`text-[8px] font-bold leading-none ${digitPosMode === "contains" ? "text-amber-600" : "text-purple-600"}`}>
                    {digitPosMode === "contains" ? "≈" : "="}
                  </span>
                </th>
                {visibleCols.map((c) => {
                  const isDigitCol = isHaneClickCol(c);
                  const tmpl = digitClickTemplate(c);
                  const selPos: number[] = colClickPos[c.id] ?? [];
                  const isHMode = selPos.length === 0;
                  /**
                   * Şablondaki her karakteri incele:
                   *   ayraç değilse → tıklanabilir hane kutusu
                   *   ayraçsa      → pasif etiket
                   */
                  const tmplItems: { ch: string; digitPos: number | null }[] = [];
                  let dIdx = 0;
                  for (const ch of tmpl) {
                    if (!isHaneSeparator(ch)) { dIdx++; tmplItems.push({ ch, digitPos: dIdx }); }
                    else { tmplItems.push({ ch, digitPos: null }); }
                  }
                  const colMode = effectiveDigitMode(c.id);
                  const hasOverride = colDigitMode[c.id] !== undefined;
                  return (
                    <th key={c.id} style={{ width: colW(c), minWidth: colW(c), maxWidth: colW(c) }}
                      className="px-0.5 py-0.5 border-r border-gray-300"
                      title={
                        c.id === "tarih"
                          ? "Tarih: gün/ay süzümü (tarih_arama). Diğer sütunlar: H = tam değer; hane kutuları = joker."
                          : `${colMode === "contains" ? "≈ İçerir" : "= Yerinde"} modu${hasOverride ? " (bu sütuna özel)" : ""} — kutudaki ≈/= ile değiştir`
                      }>
                      {c.id === "tarih" ? (
                        renderTarihGunAyPick()
                      ) : isDigitCol ? (
                        <div className="flex items-center gap-px overflow-x-hidden">
                          {/* Sütun başına H↔A mini override butonu */}
                          <button type="button"
                            className={`text-[8px] leading-none px-0.5 py-px rounded border font-bold shrink-0 transition-colors ${
                              hasOverride
                                ? (colMode === "contains" ? "bg-amber-500 border-amber-600 text-white" : "bg-purple-600 border-purple-700 text-white")
                                : "bg-white border-gray-300 text-gray-400 hover:bg-gray-100"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              // 3 durumlu: override-yok → contains → positional → override-yok
                              setColDigitMode((prev) => {
                                const cur = prev[c.id];
                                const next: Record<string, DigitPosMode> = { ...prev };
                                if (cur === undefined) next[c.id] = "contains";
                                else if (cur === "contains") next[c.id] = "positional";
                                else delete next[c.id];
                                return next;
                              });
                            }}
                            title={
                              hasOverride
                                ? `${colMode === "contains" ? "≈ İçerir (bu sütuna özel)" : "= Yerinde (bu sütuna özel)"}. Tıkla: ${colMode === "contains" ? "Yerinde'ye geç" : "Global'e dön"}`
                                : `Global mod (${digitPosMode === "contains" ? "≈ İçerir" : "= Yerinde"}). Tıkla: bu sütuna özel ≈ İçerir'e geç`
                            }
                          >
                            {colMode === "contains" ? "≈" : "="}
                          </button>
                          <button type="button"
                            className={`text-[8px] leading-none px-0.5 py-px rounded border font-bold shrink-0 transition-colors ${isHMode ? "bg-blue-600 border-blue-700 text-white" : "bg-white border-gray-400 text-gray-600 hover:bg-blue-100"}`}
                            onClick={() => setColClickPos((prev) => ({ ...prev, [c.id]: [] }))}
                            title="H: tam değer">H</button>
                          {tmplItems.map((item, ti) =>
                            item.digitPos !== null ? (
                              <button key={ti} type="button"
                                className={`text-[8px] leading-none w-[13px] flex items-center justify-center rounded border shrink-0 transition-colors ${selPos.includes(item.digitPos) ? "bg-green-600 border-green-700 text-white font-bold" : "bg-white border-gray-400 text-gray-600 hover:bg-green-100"}`}
                                onClick={() => setColClickPos((prev) => {
                                  const cur = prev[c.id] ?? [];
                                  const pos = item.digitPos!;
                                  const isSel = cur.includes(pos);
                                  return { ...prev, [c.id]: isSel ? cur.filter((x) => x !== pos) : [...cur, pos].sort((a, b) => a - b) };
                                })}
                                title={`${DIGIT_POS_LABEL[item.digitPos] ?? item.digitPos} (${item.digitPos}. hane)`}>{DIGIT_POS_LABEL[item.digitPos] ?? item.digitPos}</button>
                            ) : (
                              <span key={ti} className="text-[8px] text-gray-400 shrink-0 select-none px-px">{item.ch}</span>
                            )
                          )}
                        </div>
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            )}
            <tr className="bg-gray-200">
              {/* boş hücre — ◉ buton sütunu */}
              <th className="w-4 min-w-4 max-w-4 border-r border-gray-400" />
              {visibleCols.map((c) => {
                const isDigitCol = isDigitClickCol(c);
                const tmpl = digitClickTemplate(c);
                const selPos: number[] = colClickPos[c.id] ?? [];
                const isHMode = selPos.length === 0;
                const hasColFilterDraft = Boolean((colFilters[c.id] ?? "").trim());
                const hasDigitSel = (colClickPos[c.id]?.length ?? 0) > 0;
                const tarihPickActive =
                  c.id === "tarih" &&
                  (Boolean(tarihPick.d || tarihPick.m) ||
                    Boolean(
                      applied.tarih_gun?.trim() ||
                        applied.tarih_ay?.trim() ||
                        applied.tarih_yil?.trim()
                    ));
                const showClearCol =
                  hasColFilterDraft ||
                  hasDigitSel ||
                  Boolean(colFiltersCommitted[c.id]?.trim()) ||
                  tarihPickActive;
                return (
                  <th key={c.id} style={{ width: colW(c), minWidth: colW(c), maxWidth: colW(c) }}
                  className="px-0.5 py-0.5 border-b border-gray-400 border-r border-gray-400">
                    <div className="flex min-w-0 items-center gap-0.5">
                      <div className="flex items-center gap-0.5 min-w-0 w-full">
                  <input
                    id={`cf-input-${c.id}`}
                    value={colFilters[c.id] ?? ""}
                    onChange={(e) => setColFilters((f) => ({ ...f, [c.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                            // Enter: debounce'u atlayıp anında uygula
                            const raw = (e.target as HTMLInputElement).value;
                            const next = { ...colFilters, [c.id]: raw };
                            if (c.id === "tarih" && raw.trim()) {
                              setTarihPick({ d: "", m: "" });
                              setFilters((f) => ({
                                ...f,
                                tarih_from: "",
                                tarih_to: "",
                                tarih_gun: "",
                                tarih_ay: "",
                                tarih_yil: "",
                              }));
                              setApplied((a) => ({
                                ...a,
                                tarih_from: "",
                                tarih_to: "",
                                tarih_gun: "",
                                tarih_ay: "",
                                tarih_yil: "",
                              }));
                            }
                        commitColFilters(next);
                      } else if (e.key === "Escape") {
                        const next = { ...colFilters, [c.id]: "" };
                        setColFilters(next);
                        commitColFilters(next);
                            clearMirroredTopFilterForCfColumn(c.id);
                            if (c.id === "tarih") {
                              setTarihPick({ d: "", m: "" });
                              setFilters((f) => ({
                                ...f,
                                tarih_from: "",
                                tarih_to: "",
                                tarih_gun: "",
                                tarih_ay: "",
                                tarih_yil: "",
                              }));
                              setApplied((a) => ({
                                ...a,
                                tarih_from: "",
                                tarih_to: "",
                                tarih_gun: "",
                                tarih_ay: "",
                                tarih_yil: "",
                              }));
                            }
                          }
                        }}
                        placeholder={(() => {
                          if (!isDigitCol || isHMode || !showDigitRow) return "ara…";
                          let dI = 0; let ph = "";
                          for (const ch of tmpl) {
                            if (!isHaneSeparator(ch)) {
                              dI++;
                              ph += selPos.includes(dI) ? (DIGIT_POS_LABEL[dI] ?? "#") : "?";
                            } else { ph += ch; }
                          }
                          ph = ph.replace(/^\?+/, "*");
                          return ph + "…";
                        })()}
                        title={
                          c.id === "tarih"
                            ? "Metin: cf_tarih. Gün/ay: ⊞ Hane satırından (tarih_gun / tarih_ay, tarih_arama)."
                            : "Esc → temizle | *5?6*: wildcard | 4.9,3.2: VEYA | 4.9+3.2: VE"
                        }
                        className={`min-w-0 flex-1 bg-gray-100 border rounded px-1 py-0.5 text-[11px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 ${
                      colFiltersCommitted[c.id] ? "border-blue-600" : "border-gray-700"
                    }`}
                  />
                      {showClearCol && (
                        <button
                          type="button"
                          aria-label="Sütun filtresini temizle"
                          title="Bu sütundaki filtreyi ve hane seçimini temizle"
                          className="shrink-0 text-sky-600 hover:text-sky-800 text-[11px] leading-none px-0.5 py-0.5 rounded border border-transparent hover:border-sky-300 hover:bg-sky-50 font-semibold"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = { ...colFilters, [c.id]: "" };
                            setColFilters(next);
                            commitColFilters(next);
                            clearMirroredTopFilterForCfColumn(c.id);
                            setColClickPos((prev) => ({ ...prev, [c.id]: [] }));
                            if (c.id === "tarih") {
                              setTarihPick({ d: "", m: "" });
                              setFilters((f) => ({
                                ...f,
                                tarih_from: "",
                                tarih_to: "",
                                tarih_gun: "",
                                tarih_ay: "",
                                tarih_yil: "",
                              }));
                              setApplied((a) => ({
                                ...a,
                                tarih_from: "",
                                tarih_to: "",
                                tarih_gun: "",
                                tarih_ay: "",
                                tarih_yil: "",
                              }));
                            }
                          }}
                        >
                          ×
                        </button>
                      )}
                      </div>
                    </div>
                </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={visibleCols.length + 1} className="py-2" /></tr>
            ) : sortedRows.length === 0 ? (
              <tr><td colSpan={visibleCols.length + 1} className="text-center py-16 text-gray-700">Veri yok.</td></tr>
            ) : (
              sortedRows.map((m, ri) => {
                let hitIdx = 0;
                return (
                  <tr
                    key={String(m.id ?? ri)}
                    className={`border-b border-gray-400 transition-colors group ${
                      rowHasPlayedMs(m)
                        ? "hover:bg-white/40"
                        : "bg-gray-400/35 hover:bg-gray-400/50"
                    }`}>
                    {/* Son hane paneli açıcı — her satırın sol başında */}
                    <td className="w-4 min-w-4 max-w-4 px-0 border-r border-gray-400 text-center align-middle">
                      <button
                        title="KOD son hane vurgusu — tıkla"
                        className="w-4 h-4 flex items-center justify-center text-[9px] text-amber-500 hover:text-amber-800 hover:bg-amber-100 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rd = m.raw_data as Record<string, unknown> | null;
                          const entries = rd ? collectKodCodePickEntries(rd) : [];
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setCodePick({ entries, x: rect.right + 4, y: rect.top });
                        }}
                      >◉</button>
                    </td>
                    {visibleCols.map((c) => {
                      const val = cellVal(m, c);
                      const suffixForRow =
                        globalKodSuffix ?? rowKodSuffix(m, kodSuffixRefKey, kodSuffixN);
                      // Satır modunda sonek kaynak sütundan türetilir; o sütunun kendi hücresi her zaman eşleşirdi (yanlış tam sarı).
                      const skipRefSourceCol = !globalKodSuffix && c.key === kodSuffixRefKey;
                      const kodSonHit =
                        !skipRefSourceCol &&
                        !!suffixForRow &&
                        shouldScanColForKodSuffix(c) &&
                        cellDigitsEndWith(val, suffixForRow);
                      // ◉ panel KOD son hane: sadece KOD/oyun kodu sütunlarını vurgula (oran sütunları hariç)
                      const isKodCol =
                        KOD_ID_COL_IDS.has(c.id) ||
                        (c.group === RAW_API_GROUP && (c.key as string).startsWith("KOD"));
                      const rowClickHit =
                        !!anyKodSuffix &&
                        isKodCol &&
                        (() => {
                          const ks = anyKodSuffix;
                          const d = val.replace(/\D/g, "");
                          return d.length >= ks.n && d.endsWith(ks.digits);
                        })();
                      let cls: string;
                      if (kodSonHit || rowClickHit) {
                        cls = "bg-yellow-300/90 text-gray-900 font-semibold";
                      } else if (SCORE_COLS.has(c.id) && val) {
                        cls = "text-green-700 font-semibold";
                      } else if (computeMatchHit(c, m)) {
                        cls = HIT_COLORS[hitIdx++ % 2];
                      } else if (ODDS_GROUPS.has(c.group) && val) {
                        cls = "text-gray-900";
                      } else {
                        cls = "text-gray-900";
                      }
                      return (
                        <td key={c.id} style={{ width: colW(c), minWidth: colW(c), maxWidth: colW(c) }}
                          className={`px-1.5 py-2 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-400 font-mono cursor-pointer ${cls}`}
                          title={val}
                          onClick={() => {
                            if (!val) return;
                            // Hane seçici aktifse seçili pozisyonlara göre wildcard pattern üret
                            const positions = colClickPos[c.id] ?? [];
                            const filterVal =
                              positions.length > 0 && isHaneClickCol(c)
                                ? buildDigitPosPattern(val, positions, effectiveDigitMode(c.id))
                                : val;
                            const next = { ...colFilters, [c.id]: filterVal };
                            setColFilters(next);
                            commitColFilters(next);
                            // Filtre inputunu odakla & tüm metni seç (düzenlenebilsin)
                            requestAnimationFrame(() => {
                              const el = document.getElementById(`cf-input-${c.id}`) as HTMLInputElement | null;
                              if (el) { el.focus(); el.select(); }
                            });
                          }}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── SON HANE FİLTRE PANELİ (sağ-tık) ── */}
      {codePick && (
        <>
          {/* Backdrop — tıklayınca kapat */}
          <div className="fixed inset-0 z-40" onClick={() => setCodePick(null)} />
          <div
            className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl flex flex-col text-xs min-w-0"
            style={{
              left: Math.max(8, Math.min(codePick.x + 4, viewportW - codePickPanelW - 8)),
              top: Math.max(8, Math.min(codePick.y + 4, viewportH - codePickPanelH - 8)),
              width: codePickPanelW,
              maxHeight: codePickPanelH,
            }}
          >
            {/* Başlık */}
            <div className="flex items-center justify-between px-2 py-1.5 bg-gray-100 border-b rounded-t-lg">
              <span className="font-semibold text-gray-700">Son hane vurgusu</span>
              <button className="text-gray-400 hover:text-gray-700 text-sm leading-none" onClick={() => setCodePick(null)}>✕</button>
            </div>
            {/* Aktif filtre göstergesi */}
            {anyKodSuffix && (
              <div
                className="flex items-center gap-2 px-2 py-1 bg-yellow-50 border-b text-[10px] text-yellow-800"
                title="Ham KOD* / kod_ms… sütun filtreleri bu modda API’ye eklenmez; yalnızca buradaki son N hane uygulanır.">
                <span className="font-semibold">Filtre aktif:</span>
                <span className="font-mono bg-yellow-200 px-1 rounded">{formatAnyKodSuffixLabel(anyKodSuffix)}</span>
                <button className="ml-auto text-yellow-600 hover:text-red-600 font-semibold" onClick={() => { setAnyKodSuffix(null); setPage(1); setCodePick(null); }}>Temizle</button>
              </div>
            )}
            {/* Başlık satırı — grid ile hizalı; mobilde kod adı kırılır */}
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(4.25rem,auto)_auto] gap-x-1.5 items-center px-2 py-1 bg-gray-50 border-b text-[11px] text-gray-500 font-medium">
              <span className="min-w-0">Kod</span>
              <span className="text-right tabular-nums shrink-0">Değer</span>
              <div className="flex flex-wrap gap-0.5 justify-end shrink-0">
                {codePickSuffixColumns.map((n) => (
                  <span
                    key={n}
                    className="w-[2.65rem] text-center shrink-0"
                  >
                    son {n}
                  </span>
                ))}
              </div>
            </div>
            {/* Kod listesi */}
            <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 min-w-0">
              {codePick.entries.length === 0 && (
                <div className="px-3 py-4 text-center text-gray-400 text-[11px]">Bu satırda KOD verisi bulunamadı.</div>
              )}
              {codePick.entries.map(({ key, value }) => (
                  <div
                    key={key}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(4.25rem,auto)_auto] gap-x-1.5 items-center px-2 py-1 border-b border-gray-100 hover:bg-yellow-50">
                    <span className="font-mono font-semibold min-w-0 text-gray-800 text-xs break-all leading-snug">{key}</span>
                    <span className="font-mono text-gray-600 text-xs text-right tabular-nums shrink-0">{value}</span>
                    <div className="flex flex-wrap gap-0.5 justify-end shrink-0">
                      {codePickSuffixColumns.map((n) => {
                        const pow = 10 ** n;
                        const suffix = value % pow;
                        const tooShort = value < 10 ** (n - 1);
                        if (tooShort) return <span key={n} className="w-[2.65rem]" />;
                        const isActive =
                          anyKodSuffix?.digits === String(suffix) && anyKodSuffix?.n === n;
                        return (
                          <button
                            key={n}
                            title={`Tüm DB'de raw_data KOD* alanlarında son ${n} hane = ${suffix} olan maçları filtrele`}
                            className={`w-[2.65rem] min-h-[28px] px-0.5 py-0.5 rounded font-mono text-[11px] transition-colors ${
                              isActive
                                ? "bg-yellow-400 text-yellow-900 font-bold"
                                : "bg-yellow-100 hover:bg-yellow-400 hover:text-yellow-900 text-yellow-800"
                            }`}
                            onClick={() => {
                              setAnyKodSuffix(isActive ? null : { digits: String(suffix), n });
                              setPage(1);
                              setCodePick(null);
                            }}
                          >
                            {suffix}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {/* ── SAYFALAMA ── (veri yüklenirken tıklanmasın — tablo ile tutarlı) */}
      <div
        className={`relative z-0 flex-none min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] touch-pan-x border-t border-gray-300 bg-gray-300/60 ${
          loading ? "pointer-events-none opacity-60" : ""
        }`}>
      <div className="flex flex-nowrap sm:flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-gray-900 w-max min-w-full sm:w-auto">
        <span className="shrink-0 min-w-0 max-w-[min(100%,85vw)] sm:max-w-none flex flex-col gap-1.5 items-start">
        <span
          title={
            clientPageRowGap
              ? "Üstteki maç sayısı sunucu toplamıdır; bu sayfada tabloda daha az satır varsa istemci süzümü (MBS / sonek / OKBT) devrededir."
              : undefined
          }>
          Sayfa {page} / {totalPages||1} · {total.toLocaleString("tr-TR")} maç
            {!loading && (
              <>
                {" "}
                · <span className="tabular-nums">{sortedRows.length}</span> bu sayfada
              </>
            )}
            {globalKodSuffix &&
              ` · sonek süzümü: ${kodSuffixFilteredRows.length}`}
        </span>
          <span
            className="inline-flex flex-wrap items-center gap-1 rounded border border-amber-300/90 bg-amber-50/95 px-1.5 py-1 text-[10px] text-gray-800"
            title="raw_data içindeki tüm KOD* alanlarında son N hane; rakam sayısı N ile aynı olmalı (örn. son 4 → 7119). Tüm maçlar taranır; çok büyük tabloda sorgu yavaşlayabilir.">
            <span className="font-semibold text-amber-900 shrink-0">KOD son elle</span>
            <span className="text-gray-500 shrink-0">son</span>
            <input
              type="number"
              min={KS_PANEL_CODE_PICK_N_MIN}
              max={KS_PANEL_CODE_PICK_N_MAX}
              inputMode="numeric"
              value={manualKsN}
              onChange={(e) => setManualKsN(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyManualKodSuffixFilter();
              }}
              className="w-9 rounded border border-gray-300 bg-white px-0.5 py-px text-right tabular-nums text-[10px]"
            />
            <span className="text-gray-500 shrink-0">=</span>
            <input
              value={manualKsDigits}
              onChange={(e) => setManualKsDigits(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyManualKodSuffixFilter();
              }}
              placeholder="123…"
              className="w-[4.5rem] rounded border border-gray-300 bg-white px-0.5 py-px font-mono text-[10px]"
            />
            <button
              type="button"
              className="shrink-0 rounded border border-amber-600 bg-amber-200 px-1.5 py-px font-semibold text-amber-950 hover:bg-amber-300"
              onClick={applyManualKodSuffixFilter}
            >
              Süz
            </button>
          </span>
          {anyKodSuffix && (
            <span
              className="ml-2 inline-flex items-center gap-1 bg-yellow-200 text-yellow-900 px-1.5 py-0.5 rounded text-[10px] font-semibold"
              title="Aktifken ham KOD* ve kod_ms/iy/cs/au sütun filtreleri sunucuya gitmez; çelişkili VE ile boş liste önlenir.">
              ● {formatAnyKodSuffixLabel(anyKodSuffix)}
              <button
                className="hover:text-red-600 ml-0.5"
                title="Filtreyi temizle"
                onClick={() => {
                  setAnyKodSuffix(null);
                  setPage(1);
                }}
              >
                ✕
              </button>
            </span>
          )}
          {eslestirmeLabel && (
            <span className="ml-2 inline-flex items-center gap-1 bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded text-[10px] font-semibold">
              🎯 {eslestirmeLabel}
              <button className="hover:text-red-600 ml-0.5" title="Eşleştirme filtresini temizle" onClick={clearEslestirme}>✕</button>
            </span>
          )}
        </span>
        <div className="flex gap-1.5 shrink-0">
          {[
            { label:"««", disabled:page<=1,          action:()=>setPage(1) },
            { label:"‹",  disabled:page<=1,          action:()=>setPage((p)=>p-1) },
            { label:"›",  disabled:page>=totalPages, action:()=>setPage((p)=>p+1) },
            { label:"»»", disabled:page>=totalPages, action:()=>setPage(totalPages) },
          ].map(({ label, disabled, action }) => (
            <button key={label} disabled={disabled} onClick={action}
              className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 disabled:opacity-30 px-2.5 py-1 rounded transition">
              {label}
            </button>
          ))}
        </div>
      </div>
      </div>

      {loading &&
        tableLoadGuardRect &&
        createPortal(
          <div
            className="pointer-events-auto flex items-center justify-center bg-gray-200/90 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] backdrop-blur-[1px]"
            style={{
              position: "fixed",
              top: tableLoadGuardRect.top,
              left: tableLoadGuardRect.left,
              width: Math.max(1, tableLoadGuardRect.width),
              height: Math.max(1, tableLoadGuardRect.height),
              zIndex: 75,
            }}
            aria-busy="true"
            aria-live="polite"
            role="status">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-xs text-gray-800">Yükleniyor…</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
