"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ALL_COLS, OKBT_MULTI_SOURCES, type ColDef } from "@/lib/columns";
import { buildDigitPosPattern } from "@/lib/digit-pos-pattern";
import { padValueForDigitPattern, textColBandingWidth } from "@/lib/kod-format";

type SavedFilter = {
  id: string;
  name: string;
  folder?: string | null;
  payload: Record<string, unknown>;
};

type DayMatch = {
  id: number;
  tarih?: string | null;
  saat?: string | null;
  saat_arama?: string | null;
  lig_adi?: string | null;
  t1?: string | null;
  t2?: string | null;
};

type MatchesApiResponse = {
  data?: Record<string, unknown>[];
  totalPages?: number;
  error?: string;
  detail?: string;
};

type CompareOption = { id: string; label: string };

/** Ana tablodaki OKBT sütun id’leri: `kodms_obktb_0` vb. */
function isOkbtCompareColId(id: string): boolean {
  return /^[a-z][a-z0-9]*_obktb_\d+$/i.test(id);
}

const MatchTable = dynamic(() => import("../MatchTable"), { ssr: false });

const SPECIAL_COMPARE_DAY = "__tarih_gun__";
const EMPTY_PAYLOAD: Record<string, unknown> = {};

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

const LS_COL_FILT = "om_col_filters";
const LS_TOP_FILT = "om_top_filters";
const LS_BIDIR = "bidir_filters_v1";
const LS_COL_CLICK_POS = "om_col_click_pos";
const LS_DIGIT_POS_MODE = "om_digit_pos_mode";
const LS_COL_DIGIT_MODE = "om_col_digit_mode";

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function trimStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function formatDayMatchLabel(m: DayMatch): string {
  const sa = trimStr(m.saat_arama) || trimStr(m.saat).slice(0, 5) || "--:--";
  const t1 = trimStr(m.t1) || "?";
  const t2 = trimStr(m.t2) || "?";
  return `${sa} — ${m.id} — ${t1} & ${t2}`;
}

/** Combobox: takım adı, lig, maç ID veya tam satır etiketi ile gün listesini süz */
function dayMatchMatchesComboQuery(m: DayMatch, q: string): boolean {
  const t = trimStr(q).toLowerCase();
  if (!t) return true;
  const id = String(m.id ?? "");
  if (/^\d+$/.test(t)) return id.includes(t);
  const t1 = trimStr(m.t1).toLowerCase();
  const t2 = trimStr(m.t2).toLowerCase();
  const lig = trimStr(m.lig_adi).toLowerCase();
  const label = formatDayMatchLabel(m).toLowerCase();
  const hay = `${id} ${t1} ${t2} ${lig} ${label}`;
  return hay.includes(t);
}

function extractDayOfMonth(value: unknown): string {
  const s = trimStr(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return "";
  return m[3] ?? "";
}

function normalizeIsoDate(value: unknown): string {
  const s = trimStr(value);
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const tr = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(s);
  if (tr) {
    const [, dd, mm, yyyy] = tr;
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
}

function formatGunLikeTable(value: unknown): string {
  const raw = normalizeIsoDate(value);
  if (!raw) return "";
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(d);
  } catch {
    return "";
  }
}

function readReferenceValue(row: Record<string, unknown>, colId: string, colById: Map<string, ColDef>): string {
  if (colId === SPECIAL_COMPARE_DAY) return extractDayOfMonth(row.tarih);
  if (colId === "gun") {
    return formatGunLikeTable(row.tarih);
  }
  if (colId === "saat") {
    const hhmm = trimStr(row.saat_arama) || trimStr(row.saat).slice(0, 5);
    return hhmm;
  }
  const col = colById.get(colId);
  const candidates = new Set<string>([
    colId,
    col?.key ?? "",
    (col?.key ?? "").toLowerCase(),
    (col?.key ?? "").toUpperCase(),
  ]);
  if (colId === "alt_lig") candidates.add("alt_lig_adi");
  if (colId === "sezon") candidates.add("sezon_adi");
  if (colId === "mbs") candidates.add("mkt_display");
  if (colId === "suffix4") candidates.add("mac_suffix4");
  if (colId === "suffix3") candidates.add("msmkt_display");
  if (colId === "saat") candidates.add("saat_arama");
  if (colId === "tarih") candidates.add("tarih");

  for (const key of candidates) {
    if (!key) continue;
    const v = trimStr(row[key]);
    if (v) return v;
  }
  return "";
}

function buildSmartTableState(
  payload: Record<string, unknown>,
  compareColIds: string[],
  selectedRefRow: Record<string, unknown> | null,
): {
  topFilters: Record<string, string>;
  colFilters: Record<string, string>;
  bidirFilters: Record<string, unknown>;
  colClickPos: Record<string, number[]>;
  digitPosMode: "contains" | "positional";
  colDigitMode: Record<string, "contains" | "positional">;
} {
  const topFilters: Record<string, string> = { ...EMPTY_TOP };
  const colFiltersOut: Record<string, string> = {};
  let bidirFilters: Record<string, unknown> = {};
  let colClickPos: Record<string, number[]> = {};
  let digitPosMode: "contains" | "positional" = "contains";
  let colDigitMode: Record<string, "contains" | "positional"> = {};

  const top = payload.topFilters && typeof payload.topFilters === "object"
    ? (payload.topFilters as Record<string, unknown>)
    : {};
  for (const [k, raw] of Object.entries(top)) {
    const v = trimStr(raw);
    if (k in topFilters) topFilters[k] = v;
  }

  const colFilters = payload.colFilters && typeof payload.colFilters === "object"
    ? (payload.colFilters as Record<string, unknown>)
    : {};
  for (const [cid, raw] of Object.entries(colFilters)) {
    const v = trimStr(raw);
    if (v) colFiltersOut[cid] = v;
  }

  if (payload.bidirFilters && typeof payload.bidirFilters === "object") {
    bidirFilters = payload.bidirFilters as Record<string, unknown>;
  }
  if (payload.colClickPos && typeof payload.colClickPos === "object") {
    colClickPos = payload.colClickPos as Record<string, number[]>;
  }
  if (payload.digitPosMode === "contains" || payload.digitPosMode === "positional") {
    digitPosMode = payload.digitPosMode;
  }
  if (payload.colDigitMode && typeof payload.colDigitMode === "object") {
    const cdm = payload.colDigitMode as Record<string, string>;
    colDigitMode = Object.fromEntries(
      Object.entries(cdm).filter(([, v]) => v === "contains" || v === "positional"),
    ) as Record<string, "contains" | "positional">;
  }

  if (selectedRefRow) {
    const colById = new Map<string, ColDef>(ALL_COLS.map((c) => [c.id, c]));

    if (compareColIds.length > 0) {
      for (const colId of compareColIds) {
        // Kayıtlı filtrede bu sütunda ⊞ hane seçimi varsa (ör. maç kodu son 2), referans
        // maçın tam kodu / değeri bunu ezmesin — "mackodu son 2 + lig + gün" senaryosu.
        const savedPos = colClickPos[colId];
        if (Array.isArray(savedPos) && savedPos.length > 0) continue;

        const v = readReferenceValue(selectedRefRow, colId, colById);
        if (!v) continue;
        if (colId === SPECIAL_COMPARE_DAY) {
          topFilters.tarih_gun = v;
          topFilters.tarih_from = "";
          topFilters.tarih_to = "";
          topFilters.tarih_ay = "";
          topFilters.tarih_yil = "";
        } else if (colId === "gun") {
          // "Gün" sütunu client-computed (hafta günü) olduğu için cf_gun backend'de hataya
          // düşebiliyor; güvenli yol olarak gün numarasıyla (dd) tarih_gun kullan.
          const dayNum = extractDayOfMonth(selectedRefRow.tarih);
          if (!dayNum) continue;
          topFilters.tarih_gun = dayNum;
          topFilters.tarih_from = "";
          topFilters.tarih_to = "";
          topFilters.tarih_ay = "";
          topFilters.tarih_yil = "";
        } else if (colId === "tarih") {
          const iso = normalizeIsoDate(v);
          if (!iso) continue;
          topFilters.tarih_from = iso;
          topFilters.tarih_to = iso;
          topFilters.tarih_gun = "";
          topFilters.tarih_ay = "";
          topFilters.tarih_yil = "";
        } else {
          colFiltersOut[colId] = v;
        }
      }
    }

    for (const [colId, positions] of Object.entries(colClickPos)) {
      if (!Array.isArray(positions) || positions.length === 0) continue;
      const col = colById.get(colId);
      if (!col || col.id === "tarih" || col.id.startsWith("__")) continue;
      const v = readReferenceValue(selectedRefRow, colId, colById);
      if (!v) continue;
      const mode = colDigitMode[colId] ?? digitPosMode;
      const pat = buildDigitPosPattern(padValueForDigitPattern(colId, v), positions, mode, textColBandingWidth(colId));
      if (pat) colFiltersOut[colId] = pat;
    }
  }

  return {
    topFilters,
    colFilters: colFiltersOut,
    bidirFilters,
    colClickPos,
    digitPosMode,
    colDigitMode,
  };
}

export default function AkilliFiltrePage() {
  const [authReady, setAuthReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [savedId, setSavedId] = useState("");
  const [dayIso, setDayIso] = useState(todayIsoLocal);
  const [dayMatches, setDayMatches] = useState<DayMatch[]>([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayErr, setDayErr] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [showCompareFilters, setShowCompareFilters] = useState(false);
  const [refRow, setRefRow] = useState<Record<string, unknown> | null>(null);
  const [refRowLoading, setRefRowLoading] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [showMainTable, setShowMainTable] = useState(false);
  const [tableKey, setTableKey] = useState(0);
  /** O günün maçları: yazılabilir combobox */
  const [matchComboInput, setMatchComboInput] = useState("");
  const [matchComboOpen, setMatchComboOpen] = useState(false);
  const dayMatchComboRef = useRef<HTMLDivElement>(null);

  const selectedSaved = useMemo(
    () => filters.find((f) => f.id === savedId) ?? null,
    [filters, savedId],
  );

  /** Filtreleri klasöre göre grupla: klasörlü olanlar önce (alfabetik), grupsuz en son. */
  const groupedFilters = useMemo(() => {
    const folderMap = new Map<string, SavedFilter[]>();
    const ungrouped: SavedFilter[] = [];
    for (const f of filters) {
      const folder = f.folder?.trim() ?? "";
      if (!folder) {
        ungrouped.push(f);
      } else {
        const arr = folderMap.get(folder) ?? [];
        arr.push(f);
        folderMap.set(folder, arr);
      }
    }
    const sorted = [...folderMap.entries()].sort(([a], [b]) => a.localeCompare(b, "tr"));
    return { sorted, ungrouped };
  }, [filters]);
  const selectedDayMatch = useMemo(
    () => dayMatches.find((m) => String(m.id) === selectedMatchId) ?? null,
    [dayMatches, selectedMatchId],
  );
  const selectedDayMatchLabel = useMemo(
    () => (selectedDayMatch ? formatDayMatchLabel(selectedDayMatch) : ""),
    [selectedDayMatch],
  );
  const filteredDayMatches = useMemo(() => {
    const q = matchComboInput.trim();
    if (!q) return dayMatches;
    return dayMatches.filter((m) => dayMatchMatchesComboQuery(m, q));
  }, [dayMatches, matchComboInput]);
  const { comparePlainOptions, compareOkbtByGroup, allCompareOptionIds } = useMemo(() => {
    const seen = new Set<string>();
    const plain: CompareOption[] = [{ id: SPECIAL_COMPARE_DAY, label: "Tarih günü (dd)" }];
    const groupMap = new Map<string, CompareOption[]>();

    for (const c of ALL_COLS) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      if (isOkbtCompareColId(c.id)) {
        const g = c.group.trim() || "OKBT";
        const arr = groupMap.get(g) ?? [];
        arr.push({ id: c.id, label: c.label });
        groupMap.set(g, arr);
      } else {
        plain.push({ id: c.id, label: c.label });
      }
    }

    const okbtByGroup: { group: string; options: CompareOption[] }[] = [];
    const orderedGroupNames = OKBT_MULTI_SOURCES.map((s) => s.group);
    for (const g of orderedGroupNames) {
      const opts = groupMap.get(g);
      if (opts?.length) okbtByGroup.push({ group: g, options: opts });
      groupMap.delete(g);
    }
    for (const [group, options] of groupMap) {
      if (options.length) okbtByGroup.push({ group, options });
    }

    const allIds: string[] = [...plain.map((o) => o.id)];
    for (const { options } of okbtByGroup) {
      for (const o of options) allIds.push(o.id);
    }

    return {
      comparePlainOptions: plain,
      compareOkbtByGroup: okbtByGroup,
      allCompareOptionIds: allIds,
    };
  }, []);
  const hasAnyCriteria = useMemo(
    () => Boolean(selectedSaved) || selectedCompareIds.length > 0,
    [selectedSaved, selectedCompareIds.length],
  );

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setLoggedIn(Boolean(data.session?.user));
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(Boolean(session?.user));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshSavedFilters = useCallback(async () => {
    setSearchErr(null);
    const res = await fetch("/api/filters");
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || "Kayıtlı filtreler alınamadı");
    setFilters((json.filters ?? []) as SavedFilter[]);
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    void refreshSavedFilters().catch((e) => setSearchErr(e instanceof Error ? e.message : "Ağ hatası"));
  }, [loggedIn, refreshSavedFilters]);

  const loadMatchesForDay = useCallback(async () => {
    setSelectedMatchId("");
    setMatchComboInput("");
    setMatchComboOpen(false);
    setRefRow(null);
    setShowMainTable(false);
    setSearchErr(null);
    setDayErr(null);
    setDayLoading(true);
    try {
      const all: DayMatch[] = [];
      let page = 1;
      const pageSize = 100;
      // `pick=stb` yanıtında totalPages her zaman güvenilir değil (örn. 1); bu yüzden
      // son sayfayı "dönen satır < limit" kuralıyla tespit et.
      while (true) {
        const p = new URLSearchParams({
          tarih_from: dayIso,
          tarih_to: dayIso,
          page: String(page),
          limit: String(pageSize),
          pick: "stb",
        });
        const res = await fetch(`/api/matches?${p.toString()}`);
        const json = (await res.json()) as MatchesApiResponse;
        if (!res.ok) throw new Error(json.error || json.detail || `Hata (${res.status})`);
        const rows = ((json.data ?? []) as DayMatch[]);
        all.push(...rows);
        if (rows.length < pageSize) break;
        page += 1;
      }
      // API tarafında sayfalama sınırlarında aynı maç id'si tekrar gelebiliyor;
      // select option key çakışmaması için id bazlı tekilleştir.
      const uniqueById = new Map<string, DayMatch>();
      for (const row of all) {
        const k = String(row.id ?? "");
        if (!k) continue;
        if (!uniqueById.has(k)) uniqueById.set(k, row);
      }
      setDayMatches(Array.from(uniqueById.values()));
    } catch (e) {
      setDayErr(e instanceof Error ? e.message : "Gün maçları alınamadı");
      setDayMatches([]);
    } finally {
      setDayLoading(false);
    }
  }, [dayIso]);

  useEffect(() => {
    if (!loggedIn) return;
    void loadMatchesForDay();
  }, [loggedIn, loadMatchesForDay]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const el = dayMatchComboRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setMatchComboOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    if (!selectedMatchId) {
      setRefRow(null);
      setRefRowLoading(false);
      setShowMainTable(false);
      return;
    }
    let cancelled = false;
    setRefRowLoading(true);
    setRefRow(null);
    // id ile doğrudan eşleşme; ayrıca selectedDayMatch'teki stub veriyi de fallback olarak dene.
    const p = new URLSearchParams({ cf_id: selectedMatchId, page: "1", limit: "1" });
    fetch(`/api/matches?${p.toString()}`)
      .then((r) => r.json())
      .then((json: MatchesApiResponse) => {
        if (cancelled) return;
        const first = (json.data ?? [])[0] ?? null;
        setRefRow(first ?? (selectedDayMatch as Record<string, unknown> | null));
        setRefRowLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          // API başarısız olursa stub veriyle devam et (sınırlı alan ama colClickPos için yeterli).
          setRefRow(selectedDayMatch as Record<string, unknown> | null);
          setRefRowLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMatchId, selectedDayMatch]);

  useEffect(() => {
    if (!selectedDayMatch || !refRow || !hasAnyCriteria) {
      setShowMainTable(false);
      return;
    }
    try {
      const smart = buildSmartTableState(
        selectedSaved?.payload ?? EMPTY_PAYLOAD,
        selectedCompareIds,
        refRow,
      );
      localStorage.setItem(LS_TOP_FILT, JSON.stringify(smart.topFilters));
      localStorage.setItem(LS_COL_FILT, JSON.stringify(smart.colFilters));
      localStorage.setItem(LS_BIDIR, JSON.stringify(smart.bidirFilters));
      localStorage.setItem(LS_COL_CLICK_POS, JSON.stringify(smart.colClickPos));
      localStorage.setItem(LS_DIGIT_POS_MODE, JSON.stringify(smart.digitPosMode));
      localStorage.setItem(LS_COL_DIGIT_MODE, JSON.stringify(smart.colDigitMode));
      // om_visible_cols'a dokunma: ana tabloda kullanıcının sütun seçimi korunur (önceden []
      // yazılıyordu → boş LS "varsayılan sütunlar"a düşüyor, düzen kayboluyordu).
      setSearchErr(null);
      setShowMainTable(true);
      setTableKey((k) => k + 1);
    } catch {
      setShowMainTable(false);
      setSearchErr("Akıllı filtre ana tabloya uygulanamadı.");
    }
  }, [selectedDayMatch, refRow, hasAnyCriteria, selectedSaved?.payload, selectedCompareIds]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800">Akıllı Filtre</h1>
          <a href="/" className="text-xs text-blue-700 hover:underline">
            Ana tabloya dön
          </a>
        </div>

        {!authReady ? (
          <div className="text-xs text-slate-500">…</div>
        ) : !loggedIn ? (
          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            Bu sayfa için önce giriş yapın (kayıtlı filtreler kullanıcıya özeldir).
          </div>
        ) : (
          <>
            <div className="rounded border border-slate-200 bg-white p-3">
              <div className="flex w-full max-w-md flex-col items-stretch gap-3">
                <label className="text-xs text-slate-700">
                  Tarih (tek gün)
                  <input
                    type="date"
                    value={dayIso}
                    onChange={(e) => setDayIso(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-xs text-slate-700">
                  Kayıtlı filtre
                  <select
                    value={savedId}
                    onChange={(e) => setSavedId(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    <option value="">— Kayıtlı filtre seç —</option>
                    {groupedFilters.sorted.map(([folder, items]) => (
                      <optgroup key={folder} label={folder}>
                        {items.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </optgroup>
                    ))}
                    {groupedFilters.ungrouped.length > 0 && (
                      groupedFilters.sorted.length > 0
                        ? (
                          <optgroup label="Grupsuz">
                            {groupedFilters.ungrouped.map((f) => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </optgroup>
                        )
                        : groupedFilters.ungrouped.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))
                    )}
                  </select>
                </label>
                <div ref={dayMatchComboRef} className="text-xs text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="akilli-day-match-combo" className="cursor-default">
                      O günün maçları
                      {dayMatches.length > 0 && !dayLoading && (
                        <span className="ml-1 text-slate-400">
                          ({selectedMatchId
                            ? `${dayMatches.findIndex((m) => String(m.id) === selectedMatchId) + 1} / ${dayMatches.length}`
                            : dayMatches.length})
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-1">
                      {!dayLoading && dayMatches.length > 1 && (
                        <>
                          <button
                            type="button"
                            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                            title="Önceki maç"
                            onClick={() => {
                              const idx = dayMatches.findIndex((m) => String(m.id) === selectedMatchId);
                              const next = idx <= 0 ? dayMatches.length - 1 : idx - 1;
                              const m = dayMatches[next]!;
                              setSelectedMatchId(String(m.id));
                              setMatchComboInput(formatDayMatchLabel(m));
                              setMatchComboOpen(false);
                            }}>
                            ◀
                          </button>
                          <button
                            type="button"
                            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                            title="Sonraki maç"
                            onClick={() => {
                              const idx = dayMatches.findIndex((m) => String(m.id) === selectedMatchId);
                              const next = idx < 0 || idx >= dayMatches.length - 1 ? 0 : idx + 1;
                              const m = dayMatches[next]!;
                              setSelectedMatchId(String(m.id));
                              setMatchComboInput(formatDayMatchLabel(m));
                              setMatchComboOpen(false);
                            }}>
                            ▶
                          </button>
                        </>
                      )}
                      {selectedMatchId && !dayLoading && dayMatches.length > 0 ? (
                        <button
                          type="button"
                          className="shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50"
                          onClick={() => {
                            setSelectedMatchId("");
                            setMatchComboInput("");
                            setMatchComboOpen(false);
                          }}
                          title="Maç seçimini temizle">
                          Temizle
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <input
                    id="akilli-day-match-combo"
                    type="text"
                    value={matchComboInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setMatchComboInput(v);
                      setMatchComboOpen(true);
                      if (selectedMatchId && v !== selectedDayMatchLabel) {
                        setSelectedMatchId("");
                      }
                    }}
                    onFocus={() => setMatchComboOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setMatchComboOpen(false);
                      } else if (e.key === "ArrowLeft" && !matchComboOpen) {
                        e.preventDefault();
                        const idx = dayMatches.findIndex((m) => String(m.id) === selectedMatchId);
                        const next = idx <= 0 ? dayMatches.length - 1 : idx - 1;
                        const m = dayMatches[next];
                        if (m) { setSelectedMatchId(String(m.id)); setMatchComboInput(formatDayMatchLabel(m)); }
                      } else if (e.key === "ArrowRight" && !matchComboOpen) {
                        e.preventDefault();
                        const idx = dayMatches.findIndex((m) => String(m.id) === selectedMatchId);
                        const next = idx < 0 || idx >= dayMatches.length - 1 ? 0 : idx + 1;
                        const m = dayMatches[next];
                        if (m) { setSelectedMatchId(String(m.id)); setMatchComboInput(formatDayMatchLabel(m)); }
                      }
                    }}
                    placeholder={
                      dayLoading
                        ? "Yükleniyor…"
                        : dayMatches.length === 0
                          ? "Bu tarihte maç yok"
                          : "Takım, lig veya maç ID — listeden de seçin"
                    }
                    disabled={dayLoading || dayMatches.length === 0}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-100"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {matchComboOpen && !dayLoading && dayMatches.length > 0 ? (
                    <ul className="relative z-30 mt-0.5 max-h-52 w-full overflow-y-auto rounded border border-slate-200 bg-white py-0.5 shadow-md">
                      {filteredDayMatches.length === 0 ? (
                        <li className="px-2 py-1.5 text-[11px] text-slate-400">Eşleşen maç yok</li>
                      ) : (
                        filteredDayMatches.map((m) => (
                          <li key={m.id}>
                            <button
                              type="button"
                              className="w-full px-2 py-1 text-left text-[11px] text-slate-800 hover:bg-slate-50"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSelectedMatchId(String(m.id));
                                setMatchComboInput(formatDayMatchLabel(m));
                                setMatchComboOpen(false);
                              }}>
                              {formatDayMatchLabel(m)}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setShowCompareFilters((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
                title="Normal filtre panelini aç / kapa">
                <span className="text-xs font-medium text-slate-700">
                  Normal filtre (referans maçla aynı olacak alanlar)
                </span>
                <span className="text-[11px] text-slate-600">
                  {selectedCompareIds.length} seçili {showCompareFilters ? "▲" : "▼"}
                </span>
              </button>
              {showCompareFilters && (
                <div className="border-t border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-500">
                      Bir veya birden çok alan seçebilirsiniz. Seçilen alanlar, referans maçın değeriyle filtrelenir.
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedCompareIds([...allCompareOptionIds])}
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-50"
                        title="Tüm normal filtre alanlarını seç">
                        Hepsini seç
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCompareIds([])}
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-50"
                        title="Tüm normal filtre seçimlerini kaldır">
                        Hepsini kaldır
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto pr-1">
                    <div>
                      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Genel sütunlar
                      </h3>
                      <p className="mb-2 text-[10px] text-slate-500">
                        Maç kodu, lig, skor vb.; OKBT (basamak toplamları) aşağıda kaynağına göre gruplu.
                      </p>
                      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                        {comparePlainOptions.map((opt) => {
                          const checked = selectedCompareIds.includes(opt.id);
                          return (
                            <label key={opt.id} className="flex items-center gap-1 text-xs text-slate-700">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setSelectedCompareIds((prev) => {
                                    if (e.target.checked) return [...prev, opt.id];
                                    return prev.filter((x) => x !== opt.id);
                                  });
                                }}
                              />
                              <span>{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    {compareOkbtByGroup.map(({ group, options }) => (
                      <div key={group} className="rounded-md border border-slate-200 bg-slate-50/80 p-2">
                        <h3 className="mb-2 border-b border-slate-200 pb-1 text-[11px] font-semibold text-slate-800">
                          {group}
                        </h3>
                        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                          {options.map((opt) => {
                            const checked = selectedCompareIds.includes(opt.id);
                            return (
                              <label key={opt.id} className="flex items-center gap-1 text-xs text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    setSelectedCompareIds((prev) => {
                                      if (e.target.checked) return [...prev, opt.id];
                                      return prev.filter((x) => x !== opt.id);
                                    });
                                  }}
                                />
                                <span className="font-mono text-[11px]">{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-600">
              Tarih otomatik bugün gelir. Önce kayıtlı filtre + maç + normal filtre alanlarını seçin; sonra altta ana tablo tüm özellikleriyle açılır.
            </div>

            {dayErr && <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{dayErr}</div>}
            {searchErr && <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{searchErr}</div>}

            {!selectedMatchId || !refRow || !hasAnyCriteria || !showMainTable ? (
              <div className="rounded border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                {refRowLoading
                  ? "Maç verisi yükleniyor…"
                  : !selectedMatchId
                  ? "Sonuç görmek için maç seçin ve kayıtlı/normal filtreden en az birini işaretleyin."
                  : !refRow
                  ? "Seçilen maç verisi yüklenemedi. Lütfen tekrar deneyin."
                  : !hasAnyCriteria
                  ? "Kayıtlı filtre veya normal filtreden en az birini seçin."
                  : "Filtre uygulanıyor…"}
              </div>
            ) : (
              <div className="rounded border border-slate-200 bg-white overflow-hidden">
                <MatchTable key={tableKey} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
