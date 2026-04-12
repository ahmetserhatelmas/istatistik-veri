"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALL_COLS, DEFAULT_VISIBLE, GROUP_COLORS, mergeAllCols, type ColDef } from "@/lib/columns";

type Match = Record<string, unknown>;
interface ApiResponse {
  data: Match[]; page: number; limit: number; total: number; totalPages: number;
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

// ── wildcard / contains filtre ────────────────────────────────────────────────
function matchWildcard(value: string, pattern: string): boolean {
  const val = value.toLowerCase();
  return pattern.split("+").map((s) => s.trim()).filter(Boolean).some((part) => {
    if (!part.includes("*") && !part.includes("?")) return val.includes(part.toLowerCase());
    const re = part.replace(/[-[\]{}()|^$\\]/g,"\\$&").replace(/\./g,"\\.").replace(/\*/g,".*").replace(/\?/g,".");
    try { return new RegExp(`^${re}$`, "i").test(val); } catch { return val.includes(part.toLowerCase()); }
  });
}

function applyColFilters(rows: Match[], filters: Record<string, string>, cols: ColDef[]): Match[] {
  const active = Object.entries(filters).filter(([, v]) => v.trim());
  if (!active.length) return rows;
  return rows.filter((row) =>
    active.every(([colId, pat]) => {
      const col = cols.find((c) => c.id === colId);
      if (!col) return true;
      const raw = row[col.key];
      const val = raw == null ? "" : col.id === "saat" ? String(raw).slice(0, 5) : String(raw);
      return matchWildcard(val, pat.trim());
    })
  );
}

const GUN_FMT = new Intl.DateTimeFormat("tr-TR", { weekday: "long" });

function digitSum(val: unknown): string {
  const s = String(val ?? "").replace(/\D/g, "");
  if (!s) return "";
  return String(s.split("").reduce((acc, d) => acc + Number(d), 0));
}

function cellVal(row: Match, col: ColDef): string {
  // Hesaplanan (computed) sütunlar
  if (col.id === "mbs")     return digitSum(row["id"]);       // MKT = maç kodu basamak toplamı
  if (col.id === "suffix3") return digitSum(row["kod_ms"]);   // MsMKT = MS kodu basamak toplamı
  if (col.id === "suffix4") return digitSum(row["id"]);       // MBS standalone = aynı değer

  const raw = row[col.key] ?? null;
  if (raw == null) return "";
  if (col.id === "saat") return String(raw).slice(0, 5);
  if (col.id === "tarih") return String(raw).slice(0, 10);
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
  return String(raw);
}

const SCORE_COLS = new Set(["sonuc_iy","sonuc_ms"]);
const ODDS_GROUPS = new Set(["Maç Sonucu","OKBT","Durumlar","KG","Tek/Çift","Top.Gol","Alt/Üst","IY A/Ü","Ev A/Ü","Dep A/Ü","MS A/Ü","Çift Şans","İlk Gol","Daha Çok Gol Y.","Maç Skoru","IY Skoru"]);

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
  const h2g = hasFt && hasHt ? (ft1 - ht1) + (ft2 - ht2) : NaN; // 2. yarı gol

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

    // ── Durumlar (IY/MS kombinasyonu) ──────────────────────────────────────────
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

    // ── Daha Çok Gol Yarısı ───────────────────────────────────────────────────
    case "ikiys1": return hasFt && hasHt && iyg > h2g ? "orange" : null;
    case "ikiysx": return hasFt && hasHt && iyg === h2g ? "green" : null;
    case "ikiys2": return hasFt && hasHt && h2g > iyg ? "green" : null;

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

    // ── Maç Skoru (sk00–sk99 + skdig) ─────────────────────────────────────────
    case "skdig": return hasFt && (ft1 > 9 || ft2 > 9) ? "green" : null;

    default: {
      if (!hasFt) return null;
      if (col.id.startsWith("sk") && col.id !== "skdig") {
        return col.id === `sk${ft1}${ft2}` && ft1 <= 9 && ft2 <= 9 ? "green" : null;
      }
      return null;
    }
  }
}

const HIT_COLORS = [
  "bg-green-500/30 text-green-900",
  "bg-orange-500/30 text-orange-900",
] as const;

function buildGroupSpans(cols: ColDef[]) {
  const spans: { group: string; count: number }[] = [];
  for (const c of cols) {
    if (spans.length && spans[spans.length-1].group === c.group) spans[spans.length-1].count++;
    else spans.push({ group: c.group, count: 1 });
  }
  return spans;
}

// ── localStorage ──────────────────────────────────────────────────────────────
const LS_VISIBLE  = "om_visible_cols";
const LS_COL_FILT = "om_col_filters";
const LS_TOP_FILT = "om_top_filters";
const LS_PRESETS  = "om_col_presets";

function lsGet<T>(key: string, fb: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as T : fb; }
  catch { return fb; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
}

// ── preset (sadece sütun seçimi kaydeder) ─────────────────────────────────────
interface ColPreset { name: string; ids: string[]; }

const EMPTY_TOP = { tarih_from:"", tarih_to:"", lig:"", takim:"", sonuc_iy:"", sonuc_ms:"", hakem:"", suffix4:"", suffix3:"" };

export default function MatchTable() {
  const [matches, setMatches]     = useState<Match[]>([]);
  const [loading, setLoading]     = useState(false);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(0);
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

  function commitColFilters(next: Record<string,string>) {
    setColFiltersCommitted(next);
    lsSet(LS_COL_FILT, next);
    setPage(1);
  }

  // localStorage otomatik kaydet
  useEffect(() => { lsSet(LS_VISIBLE,  Array.from(visibleIds)); }, [visibleIds]);
  useEffect(() => { lsSet(LS_TOP_FILT, filters); },                [filters]);

  const visibleCols  = mergedCols.filter((c) => visibleIds.has(c.id));
  const groupSpans   = buildGroupSpans(visibleCols);
  const groups       = Array.from(new Set(mergedCols.map((c) => c.group)));

  // DB sütunları → server filtresi | raw_data → client filtresi
  const DB_COL_IDS = new Set(ALL_COLS.filter((c) => c.dbCol).map((c) => c.id));
  const rawColFilters = Object.fromEntries(
    Object.entries(colFiltersCommitted).filter(([id]) => !DB_COL_IDS.has(id))
  );
  const filteredRows = applyColFilters(matches, rawColFilters, visibleCols);

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

  const sortedRows = useMemo(() => {
    if (!sortCol) return filteredRows;
    const col = mergedCols.find((c) => c.id === sortCol);
    if (!col) return filteredRows;
    return [...filteredRows].sort((a, b) => {
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
  }, [filteredRows, sortCol, sortDir, mergedCols]);

  // dbCol filtreleri değişince server fetch
  const [dbColFiltersApplied, setDbColFiltersApplied] = useState<Record<string,string>>({});
  useEffect(() => {
    const dbPart = Object.fromEntries(
      Object.entries(colFiltersCommitted).filter(([id, v]) => DB_COL_IDS.has(id) && v.trim())
    );
    setDbColFiltersApplied(dbPart);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colFiltersCommitted]);
  const colW         = (c: ColDef) => c.width ?? 60;

  // veri çek
  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: "100" });
    Object.entries(applied).forEach(([k,v]) => { if (v.trim()) p.set(k, v.trim()); });
    // dbCol sütun filtrelerini cf_ prefix ile gönder
    Object.entries(dbColFiltersApplied).forEach(([id, v]) => {
      if (v.trim()) p.set(`cf_${id}`, v.trim());
    });
    try {
      const [res, syncRes] = await Promise.all([
        fetch(`/api/matches?${p}`),
        fetch("/api/sync-status"),
      ]);
      const json: ApiResponse = await res.json();
      setMatches(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 0);
      if (syncRes.ok) {
        const s = (await syncRes.json()) as { lastSyncAt?: string | null };
        setLastSyncAt(s.lastSyncAt ?? null);
      }
    } catch { setMatches([]); }
    setLoading(false);
  }, [page, applied, dbColFiltersApplied]);
  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  // panel dışı tıkla kapat
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShowColPanel(false); };
    if (showColPanel) document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [showColPanel]);

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

  function clearFilters() {
    setFilters(EMPTY_TOP); setApplied(EMPTY_TOP);
    setColFilters({}); setColFiltersCommitted({});
    setPage(1);
    lsSet(LS_TOP_FILT, EMPTY_TOP); lsSet(LS_COL_FILT, {});
  }

  return (
    <div className="flex flex-col h-screen bg-gray-200 text-gray-900 overflow-hidden">

      {/* ── HEADER ── */}
      <header className="flex-none border-b border-gray-300 bg-gray-300">
        <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
          <span className="text-xs text-gray-700 whitespace-nowrap">
            {total.toLocaleString("tr-TR")} maç
            {lastSyncAt && (
              <span className="text-gray-700">
                {" "}
                · son veri çekimi:{" "}
                <span className="text-gray-800 tabular-nums" title="Europe/Istanbul">
                  {formatLastSyncTr(lastSyncAt)}
                </span>
              </span>
            )}
            {loading && <span className="ml-1.5 inline-block w-3 h-3 border-2 border-gray-500 border-t-blue-400 rounded-full animate-spin align-middle" />}
            {Object.values(colFiltersCommitted).some(Boolean) && !loading && <span className="text-amber-600"> · {filteredRows.length} eşleşti</span>}
          </span>

          {/* Sütunlar butonu */}
          <div className="relative ml-auto flex items-center gap-3" ref={panelRef}>
            {balance != null && (
              <span className="text-xs text-gray-700 whitespace-nowrap">
                Bakiye:{" "}
                <span className="font-semibold text-gray-900">{balance}</span>
              </span>
            )}
            <button onClick={() => setShowColPanel((v) => !v)}
              className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 text-xs px-3 py-1.5 rounded transition font-medium whitespace-nowrap">
              ☰ Sütunlar ({visibleIds.size})
            </button>

            {showColPanel && (
              <div className="absolute right-0 top-full mt-1 z-50 w-[620px] max-h-[80vh] overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-2xl p-3">

                {/* ── Araç çubuğu ── */}
                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-700">
                  <button onClick={selectAll} className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded">Hepsini Seç</button>
                  <button onClick={resetCols} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-900 px-2 py-1 rounded border border-gray-300">Varsayılan</button>
                  <button onClick={hideAll}   className="text-xs bg-red-900/60 hover:bg-red-800/60 px-2 py-1 rounded">Hepsini Gizle</button>
                  <span className="text-xs text-gray-700 self-center ml-auto">{visibleIds.size} / {mergedCols.length}</span>
                </div>

                {/* ── PRESET KAYDET / YÜKLE ── */}
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
                            className={`text-[11px] px-2 py-0.5 rounded border transition ${
                              visibleIds.has(c.id) ? "bg-blue-600 border-blue-500 text-white" : "bg-white border-gray-300 text-gray-800 hover:bg-gray-100"
                            }`}>
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

        {/* Grup renk çubuğu */}
        <div className="flex overflow-x-auto">
          {groups.map((grp) => {
            const cnt = mergedCols.filter((c) => c.group===grp && visibleIds.has(c.id)).length;
            if (cnt === 0) return null;
            return (
              <button key={grp} onClick={() => toggleGroup(grp)}
                className={`text-[10px] px-2 py-0.5 whitespace-nowrap border-r border-gray-300 text-gray-900 ${GROUP_COLORS[grp]??"bg-gray-200"} hover:brightness-95 transition`}>
                {grp} <span className="text-gray-600">·{cnt}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ── TABLO ── */}
      <div className="flex-1 overflow-auto relative">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-200/70 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-xs text-gray-800">Yükleniyor…</span>
            </div>
          </div>
        )}
        <table className="text-xs border-collapse" style={{ minWidth: visibleCols.reduce((s,c) => s+colW(c), 0) }}>
          <thead className="sticky top-0 z-20">
            <tr>
              {groupSpans.map((gs, i) => (
                <th key={i} colSpan={gs.count}
                  className={`px-1 py-0.5 text-center text-[10px] font-semibold text-gray-900 border-b border-gray-400 border-r border-gray-400 whitespace-nowrap ${GROUP_COLORS[gs.group]??"bg-gray-300"}`}>
                  {gs.group}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-300">
              {visibleCols.map((c) => (
                <th key={c.id} style={{ minWidth:colW(c), maxWidth:colW(c) }}
                  onClick={() => handleSort(c.id)}
                  className="px-1.5 py-1 text-left font-medium text-gray-900 whitespace-nowrap border-b border-gray-400 border-r border-gray-400 cursor-pointer select-none hover:bg-gray-400/40 transition-colors">
                  <span className="flex items-center gap-0.5">
                    {c.label}
                    {sortCol === c.id
                      ? <span className="text-blue-700 text-[10px]">{sortDir === "asc" ? " ▲" : " ▼"}</span>
                      : <span className="text-gray-400 text-[10px] opacity-0 group-hover:opacity-100"> ⇅</span>
                    }
                  </span>
                </th>
              ))}
            </tr>
            <tr className="bg-gray-200">
              {visibleCols.map((c) => (
                <th key={c.id} style={{ minWidth:colW(c), maxWidth:colW(c) }}
                  className="px-0.5 py-0.5 border-b border-gray-400 border-r border-gray-400">
                  <input
                    id={`cf-input-${c.id}`}
                    value={colFilters[c.id] ?? ""}
                    onChange={(e) => setColFilters((f) => ({ ...f, [c.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const next = { ...colFilters, [c.id]: (e.target as HTMLInputElement).value };
                        commitColFilters(next);
                      } else if (e.key === "Escape") {
                        const next = { ...colFilters, [c.id]: "" };
                        setColFilters(next);
                        commitColFilters(next);
                      }
                    }}
                    placeholder="ara… (Enter)"
                    title="Enter → ara | Esc → temizle | *5?6*: wildcard | 4.9+3.2: VEYA"
                    className={`w-full bg-gray-100 border border-gray-400 rounded px-1 py-0.5 text-[10px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 ${
                      colFiltersCommitted[c.id] ? "border-blue-600" : "border-gray-700"
                    }`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={visibleCols.length} className="py-2" /></tr>
            ) : sortedRows.length === 0 ? (
              <tr><td colSpan={visibleCols.length} className="text-center py-16 text-gray-700">Veri yok.</td></tr>
            ) : (
              sortedRows.map((m, ri) => {
                let hitIdx = 0;
                return (
                  <tr key={String(m.id??ri)} className="border-b border-gray-400 hover:bg-white/40 transition-colors">
                    {visibleCols.map((c) => {
                      const val = cellVal(m, c);
                      let cls: string;
                      if (SCORE_COLS.has(c.id) && val) {
                        cls = "text-green-700 font-semibold";
                      } else if (computeMatchHit(c, m)) {
                        cls = HIT_COLORS[hitIdx++ % 2];
                      } else if (ODDS_GROUPS.has(c.group) && val) {
                        cls = "text-gray-900";
                      } else {
                        cls = "text-gray-900";
                      }
                      return (
                        <td key={c.id} style={{ minWidth:colW(c), maxWidth:colW(c) }}
                          className={`px-1.5 py-1 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-400 font-mono cursor-pointer ${cls}`}
                          title={val}
                          onClick={() => {
                            if (!val) return;
                            const next = { ...colFilters, [c.id]: val };
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

      {/* ── SAYFALAMA ── */}
      <div className="flex-none flex items-center justify-between px-4 py-2 border-t border-gray-300 bg-gray-300/60 text-xs text-gray-900">
        <span>
          Sayfa {page} / {totalPages||1} · {total.toLocaleString("tr-TR")} maç
          {Object.values(colFiltersCommitted).some(Boolean) && ` · filtreli: ${filteredRows.length}`}
        </span>
        <div className="flex gap-1.5">
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
  );
}
