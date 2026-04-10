"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ALL_COLS, DEFAULT_VISIBLE, GROUP_COLORS, type ColDef } from "@/lib/columns";

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

function cellVal(row: Match, col: ColDef): string {
  const raw = row[col.key] ?? null;
  if (raw == null) return "";
  if (col.id === "saat") return String(raw).slice(0, 5);
  if (col.id === "tarih") return String(raw).slice(0, 10);
  return String(raw);
}

const SCORE_COLS = new Set(["sonuc_iy","sonuc_ms"]);
const ODDS_GROUPS = new Set(["Maç Sonucu","OKBT","Durumlar","KG","Tek/Çift","Top.Gol","Alt/Üst","IY A/Ü","Ev A/Ü","Dep A/Ü","MS A/Ü","Çift Şans","İlk Gol","Daha Çok Gol Y.","Maç Skoru","IY Skoru"]);
function cellColor(col: ColDef, val: string) {
  if (SCORE_COLS.has(col.id) && val) return "text-green-400";
  if (ODDS_GROUPS.has(col.group) && val) return "text-amber-300";
  return "text-gray-200";
}

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

  // sütun bazlı filtreler
  const [colFilters, setColFilters] = useState<Record<string,string>>(() => lsGet<Record<string,string>>(LS_COL_FILT, {}));

  // localStorage otomatik kaydet
  useEffect(() => { lsSet(LS_VISIBLE,  Array.from(visibleIds)); }, [visibleIds]);
  useEffect(() => { lsSet(LS_COL_FILT, colFilters); },             [colFilters]);
  useEffect(() => { lsSet(LS_TOP_FILT, filters); },                [filters]);

  const visibleCols  = ALL_COLS.filter((c) => visibleIds.has(c.id));
  const groupSpans   = buildGroupSpans(visibleCols);
  const groups       = Array.from(new Set(ALL_COLS.map((c) => c.group)));

  // DB sütunları → server filtresi | raw_data → client filtresi
  const DB_COL_IDS = new Set(ALL_COLS.filter((c) => c.dbCol).map((c) => c.id));
  const rawColFilters = Object.fromEntries(
    Object.entries(colFilters).filter(([id]) => !DB_COL_IDS.has(id))
  );
  const filteredRows = applyColFilters(matches, rawColFilters, visibleCols);

  // Debounce: dbCol filtreleri 400ms sonra server fetch'e yansıt
  const [dbColFiltersApplied, setDbColFiltersApplied] = useState<Record<string,string>>({});
  useEffect(() => {
    const dbPart = Object.fromEntries(
      Object.entries(colFilters).filter(([id, v]) => DB_COL_IDS.has(id) && v.trim())
    );
    const timer = setTimeout(() => {
      setDbColFiltersApplied(dbPart);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colFilters]);
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
    const ids = ALL_COLS.filter((c) => c.group===grp).map((c) => c.id);
    const allOn = ids.every((id) => visibleIds.has(id));
    setVisibleIds((p) => { const n=new Set(p); ids.forEach((id) => allOn?n.delete(id):n.add(id)); return n; });
  }
  function selectAll()  { setVisibleIds(new Set(ALL_COLS.map((c) => c.id))); }
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
    setFilters(EMPTY_TOP); setApplied(EMPTY_TOP); setColFilters({}); setPage(1);
    lsSet(LS_TOP_FILT, EMPTY_TOP); lsSet(LS_COL_FILT, {});
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden">

      {/* ── HEADER ── */}
      <header className="flex-none border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800/60 flex-wrap">
          <span className="font-bold tracking-tight whitespace-nowrap">Oran Merkezi</span>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {total.toLocaleString("tr-TR")} maç
            {lastSyncAt && (
              <span className="text-gray-500">
                {" "}
                · son veri çekimi:{" "}
                <span
                  className="text-gray-400 tabular-nums"
                  title="Europe/Istanbul"
                >
                  {formatLastSyncTr(lastSyncAt)}
                </span>
              </span>
            )}
            {loading && <span className="ml-1.5 inline-block w-3 h-3 border-2 border-gray-500 border-t-blue-400 rounded-full animate-spin align-middle" />}
            {Object.values(colFilters).some(Boolean) && !loading && <span className="text-amber-400"> · {filteredRows.length} eşleşti</span>}
          </span>

          {/* Üst filtreler */}
          {[
            { k:"tarih_from", ph:"Tarih ≥", type:"date", w:130 },
            { k:"tarih_to",   ph:"Tarih ≤", type:"date", w:130 },
            { k:"lig",        ph:"Lig",     type:"text", w:100 },
            { k:"takim",      ph:"Takım",   type:"text", w:100 },
            { k:"sonuc_iy",   ph:"IY",      type:"text", w:60  },
            { k:"sonuc_ms",   ph:"MS",      type:"text", w:60  },
            { k:"hakem",      ph:"Hakem",   type:"text", w:90  },
            { k:"suffix4",    ph:"S4",      type:"text", w:52  },
            { k:"suffix3",    ph:"S3",      type:"text", w:52  },
          ].map(({ k, ph, type, w }) => (
            <input key={k} type={type} placeholder={ph}
              value={filters[k as keyof typeof filters]}
              onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.value }))}
              style={{ width: w }}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          ))}
          <button onClick={() => { setPage(1); setApplied({...filters}); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap">
            Ara
          </button>
          <button onClick={clearFilters}
            className="bg-gray-700 hover:bg-gray-600 text-white px-2.5 py-1 rounded text-xs transition whitespace-nowrap">
            Temizle
          </button>

          {/* Sütunlar butonu */}
          <div className="relative ml-auto" ref={panelRef}>
            <button onClick={() => setShowColPanel((v) => !v)}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-xs px-3 py-1.5 rounded transition font-medium whitespace-nowrap">
              ☰ Sütunlar ({visibleIds.size})
            </button>

            {showColPanel && (
              <div className="absolute right-0 top-full mt-1 z-50 w-[620px] max-h-[80vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-3">

                {/* ── Araç çubuğu ── */}
                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-700">
                  <button onClick={selectAll} className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded">Hepsini Seç</button>
                  <button onClick={resetCols} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">Varsayılan</button>
                  <button onClick={hideAll}   className="text-xs bg-red-900/60 hover:bg-red-800/60 px-2 py-1 rounded">Hepsini Gizle</button>
                  <span className="text-xs text-gray-500 self-center ml-auto">{visibleIds.size} / {ALL_COLS.length}</span>
                </div>

                {/* ── PRESET KAYDET / YÜKLE ── */}
                <div className="mb-3 pb-3 border-b border-gray-700">
                  <p className="text-[11px] text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Sütun Düzenini Kaydet</p>
                  <div className="flex gap-1.5 items-center mb-2">
                    <input
                      value={presetInput}
                      onChange={(e) => setPresetInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveColPreset(); }}
                      placeholder="Preset adı… (örn: Temel görünüm)"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
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
                        <div key={p.name} className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded px-2 py-1">
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
                  const cols = ALL_COLS.filter((c) => c.group === grp);
                  const onCount = cols.filter((c) => visibleIds.has(c.id)).length;
                  const color = GROUP_COLORS[grp] ?? "bg-gray-800";
                  return (
                    <div key={grp} className="mb-3">
                      <button onClick={() => toggleGroup(grp)}
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${color} w-full text-left mb-1`}>
                        {grp} <span className="text-gray-400 font-normal">({onCount}/{cols.length})</span>
                      </button>
                      <div className="flex flex-wrap gap-1 pl-1">
                        {cols.map((c) => (
                          <button key={c.id} onClick={() => toggleCol(c.id)}
                            className={`text-[11px] px-2 py-0.5 rounded border transition ${
                              visibleIds.has(c.id) ? "bg-blue-700 border-blue-500 text-white" : "bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700"
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
            const cnt = ALL_COLS.filter((c) => c.group===grp && visibleIds.has(c.id)).length;
            if (cnt === 0) return null;
            return (
              <button key={grp} onClick={() => toggleGroup(grp)}
                className={`text-[10px] px-2 py-0.5 whitespace-nowrap border-r border-gray-800/60 ${GROUP_COLORS[grp]??"bg-gray-800"} hover:brightness-110 transition`}>
                {grp} <span className="text-gray-400">·{cnt}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ── TABLO ── */}
      <div className="flex-1 overflow-auto relative">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-950/70 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-xs text-gray-400">Yükleniyor…</span>
            </div>
          </div>
        )}
        <table className="text-xs border-collapse" style={{ minWidth: visibleCols.reduce((s,c) => s+colW(c), 0) }}>
          <thead className="sticky top-0 z-20">
            <tr>
              {groupSpans.map((gs, i) => (
                <th key={i} colSpan={gs.count}
                  className={`px-1 py-0.5 text-center text-[10px] font-semibold border-b border-gray-700 whitespace-nowrap ${GROUP_COLORS[gs.group]??"bg-gray-900"}`}>
                  {gs.group}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-900">
              {visibleCols.map((c) => (
                <th key={c.id} style={{ minWidth:colW(c), maxWidth:colW(c) }}
                  className="px-1.5 py-1 text-left font-medium text-gray-300 whitespace-nowrap border-b border-gray-800 border-r border-gray-800/50">
                  {c.label}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-950">
              {visibleCols.map((c) => (
                <th key={c.id} style={{ minWidth:colW(c), maxWidth:colW(c) }}
                  className="px-0.5 py-0.5 border-b border-gray-700 border-r border-gray-800/50">
                  <input
                    value={colFilters[c.id] ?? ""}
                    onChange={(e) => setColFilters((f) => ({ ...f, [c.id]: e.target.value }))}
                    placeholder="ara…"
                    title="Yaz: içerir | *5?6*: wildcard | 4.9+3.2: VEYA"
                    className="w-full bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-[10px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={visibleCols.length} className="py-2" /></tr>
            ) : filteredRows.length === 0 ? (
              <tr><td colSpan={visibleCols.length} className="text-center py-16 text-gray-500">Veri yok.</td></tr>
            ) : (
              filteredRows.map((m, ri) => (
                <tr key={String(m.id??ri)} className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors">
                  {visibleCols.map((c) => {
                    const val = cellVal(m, c);
                    return (
                      <td key={c.id} style={{ minWidth:colW(c), maxWidth:colW(c) }}
                        className={`px-1.5 py-1 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-800/30 font-mono ${cellColor(c,val)}`}
                        title={val}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── SAYFALAMA ── */}
      <div className="flex-none flex items-center justify-between px-4 py-2 border-t border-gray-800 bg-gray-900/60 text-xs text-gray-400">
        <span>
          Sayfa {page} / {totalPages||1} · {total.toLocaleString("tr-TR")} maç
          {Object.values(colFilters).some(Boolean) && ` · filtreli: ${filteredRows.length}`}
        </span>
        <div className="flex gap-1.5">
          {[
            { label:"««", disabled:page<=1,          action:()=>setPage(1) },
            { label:"‹",  disabled:page<=1,          action:()=>setPage((p)=>p-1) },
            { label:"›",  disabled:page>=totalPages, action:()=>setPage((p)=>p+1) },
            { label:"»»", disabled:page>=totalPages, action:()=>setPage(totalPages) },
          ].map(({ label, disabled, action }) => (
            <button key={label} disabled={disabled} onClick={action}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-30 px-2.5 py-1 rounded transition">
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
