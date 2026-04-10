"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ALL_COLS, DEFAULT_VISIBLE, GROUP_COLORS, type ColDef } from "@/lib/columns";

// ── types ────────────────────────────────────────────────────────────────────
type Match = Record<string, unknown>;
interface ApiResponse {
  data: Match[]; page: number; limit: number; total: number; totalPages: number;
}

// ── wildcard matching ─────────────────────────────────────────────────────────
// Desteklenen sözdizimi:
//   *     → herhangi karakter dizisi
//   ?     → tek herhangi karakter
//   +     → VEYA ayırıcısı (*5*+*6* = içinde 5 VEYA 6 olan)
function matchWildcard(value: string, pattern: string): boolean {
  const val = value.toLowerCase();
  const orParts = pattern.split("+").map((s) => s.trim()).filter(Boolean);
  return orParts.some((part) => {
    // * → .* ve ? → . dönüşümü (diğer regex özel karakterleri escape)
    const regStr = part
      .replace(/[-[\]{}()|^$\\]/g, "\\$&")
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    try {
      return new RegExp(`^${regStr}$`, "i").test(val);
    } catch {
      return val.includes(part.toLowerCase());
    }
  });
}

function applyColFilters(rows: Match[], filters: Record<string, string>, cols: ColDef[]): Match[] {
  const active = Object.entries(filters).filter(([, v]) => v.trim());
  if (!active.length) return rows;
  return rows.filter((row) =>
    active.every(([colId, pat]) => {
      const col = cols.find((c) => c.id === colId);
      if (!col) return true;
      const raw = col.dbCol ? row[col.key] : row[col.key];
      const val = raw == null ? "" : col.id === "saat" ? String(raw).slice(0, 5) : String(raw);
      return matchWildcard(val, pat.trim());
    })
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────
function cellVal(row: Match, col: ColDef): string {
  const raw = row[col.key] ?? null;
  if (raw == null) return "";
  if (col.id === "saat") return String(raw).slice(0, 5);
  if (col.id === "tarih") return String(raw).slice(0, 10);
  return String(raw);
}

const SCORE_COLS = new Set(["sonuc_iy", "sonuc_ms"]);
const ODDS_GROUPS = new Set([
  "Maç Sonucu","Yarı Son.","IY MS","KG","Tek/Çift","Top.Gol",
  "Alt/Üst","IY A/Ü","Ev A/Ü","Dep A/Ü","MS A/Ü",
  "Çift Şans","İlk Gol","Daha Çok Gol Y.","Maç Skoru","IY Skoru",
]);
function cellColor(col: ColDef, val: string): string {
  if (SCORE_COLS.has(col.id) && val) return "text-green-400";
  if (ODDS_GROUPS.has(col.group) && val) return "text-amber-300";
  return "text-gray-200";
}

function buildGroupSpans(cols: ColDef[]) {
  const spans: { group: string; count: number }[] = [];
  for (const c of cols) {
    if (spans.length && spans[spans.length - 1].group === c.group) spans[spans.length - 1].count++;
    else spans.push({ group: c.group, count: 1 });
  }
  return spans;
}

// ── main component ────────────────────────────────────────────────────────────
export default function MatchTable() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // sütun görünürlük
  const [visibleIds, setVisibleIds] = useState<Set<string>>(DEFAULT_VISIBLE);
  const [showColPanel, setShowColPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // üst filtreler (sunucu tarafı)
  const [filters, setFilters] = useState({
    tarih_from: "", tarih_to: "", lig: "", takim: "",
    sonuc_iy: "", sonuc_ms: "", hakem: "", suffix4: "", suffix3: "",
  });
  const [applied, setApplied] = useState(filters);

  // sütun bazlı filtreler (istemci wildcard)
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  const visibleCols = ALL_COLS.filter((c) => visibleIds.has(c.id));
  const groupSpans = buildGroupSpans(visibleCols);
  const groups = Array.from(new Set(ALL_COLS.map((c) => c.group)));

  const filteredRows = applyColFilters(matches, colFilters, visibleCols);

  // ── veri çek ────────────────────────────────────────────────────────────
  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "100" });
    Object.entries(applied).forEach(([k, v]) => { if (v.trim()) params.set(k, v.trim()); });
    try {
      const res = await fetch(`/api/matches?${params}`);
      const json: ApiResponse = await res.json();
      setMatches(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 0);
    } catch { setMatches([]); }
    setLoading(false);
  }, [page, applied]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  // panel dışı tıkla kapat
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setShowColPanel(false);
    }
    if (showColPanel) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showColPanel]);

  // ── sütun işlemleri ──────────────────────────────────────────────────────
  function toggleCol(id: string) {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleGroup(group: string) {
    const ids = ALL_COLS.filter((c) => c.group === group).map((c) => c.id);
    const allOn = ids.every((id) => visibleIds.has(id));
    setVisibleIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  }
  function selectAll() { setVisibleIds(new Set(ALL_COLS.map((c) => c.id))); }
  function resetCols() { setVisibleIds(new Set(DEFAULT_VISIBLE)); }

  function clearFilters() {
    const e = { tarih_from:"",tarih_to:"",lig:"",takim:"",sonuc_iy:"",sonuc_ms:"",hakem:"",suffix4:"",suffix3:"" };
    setFilters(e); setApplied(e); setColFilters({}); setPage(1);
  }

  const totalCols = visibleCols.length;
  const colW = (c: ColDef) => c.width ?? 60;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden">

      {/* ═══ MENÜ ÇUBUĞU ═══════════════════════════════════════════════════ */}
      <header className="flex-none border-b border-gray-800 bg-gray-900">
        {/* Başlık satırı */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800/60">
          <div>
            <span className="font-bold tracking-tight">Oran Merkezi</span>
            <span className="ml-2 text-xs text-gray-400">
              {total.toLocaleString("tr-TR")} maç · {visibleCols.length} sütun görünür
              {Object.values(colFilters).some(Boolean) && (
                <span className="ml-1 text-amber-400">· {filteredRows.length} satır eşleşti</span>
              )}
            </span>
          </div>

          {/* Üst filtreler */}
          <div className="ml-4 flex flex-wrap gap-1.5 items-center flex-1">
            {[
              { k:"tarih_from", ph:"Tarih ≥", type:"date", w:130 },
              { k:"tarih_to",   ph:"Tarih ≤", type:"date", w:130 },
              { k:"lig",        ph:"Lig",      type:"text", w:110 },
              { k:"takim",      ph:"Takım",    type:"text", w:110 },
              { k:"sonuc_iy",   ph:"IY Skor",  type:"text", w:80 },
              { k:"sonuc_ms",   ph:"MS Skor",  type:"text", w:80 },
              { k:"hakem",      ph:"Hakem",    type:"text", w:100 },
              { k:"suffix4",    ph:"S4",       type:"text", w:60 },
              { k:"suffix3",    ph:"S3",       type:"text", w:60 },
            ].map(({ k, ph, type, w }) => (
              <input key={k} type={type} placeholder={ph}
                value={filters[k as keyof typeof filters]}
                onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.value }))}
                style={{ width: w }}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            ))}
            <button onClick={() => { setPage(1); setApplied({ ...filters }); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-xs font-medium transition">
              Ara
            </button>
            <button onClick={clearFilters}
              className="bg-gray-700 hover:bg-gray-600 text-white px-2.5 py-1 rounded text-xs transition">
              Temizle
            </button>
          </div>

          {/* Sütunlar butonu */}
          <div className="relative ml-auto" ref={panelRef}>
            <button onClick={() => setShowColPanel((v) => !v)}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-xs px-3 py-1.5 rounded transition font-medium">
              ☰ Sütunlar
            </button>

            {showColPanel && (
              <div className="absolute right-0 top-full mt-1 z-50 w-[600px] max-h-[75vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-3">
                {/* Araç çubuğu */}
                <div className="flex gap-2 mb-3 pb-2 border-b border-gray-700">
                  <button onClick={selectAll}  className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded">Hepsini Seç</button>
                  <button onClick={resetCols} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">Varsayılan</button>
                  <button onClick={() => setVisibleIds(new Set())} className="text-xs bg-red-900/60 hover:bg-red-800/60 px-2 py-1 rounded">Hepsini Gizle</button>
                  <span className="ml-auto text-xs text-gray-500 self-center">{visibleIds.size} / {ALL_COLS.length} seçili</span>
                </div>
                {/* Gruplar */}
                {groups.map((grp) => {
                  const cols = ALL_COLS.filter((c) => c.group === grp);
                  const onCount = cols.filter((c) => visibleIds.has(c.id)).length;
                  const color = GROUP_COLORS[grp] ?? "bg-gray-800";
                  return (
                    <div key={grp} className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <button onClick={() => toggleGroup(grp)}
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${color} flex-1 text-left`}>
                          {grp}
                          <span className="ml-1 text-gray-400 font-normal">({onCount}/{cols.length})</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 pl-1">
                        {cols.map((c) => (
                          <button key={c.id} onClick={() => toggleCol(c.id)}
                            className={`text-[11px] px-2 py-0.5 rounded border transition ${
                              visibleIds.has(c.id)
                                ? "bg-blue-700 border-blue-500 text-white"
                                : "bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700"
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

        {/* Grup renk çubuğu — sütun seçici değil, sadece renk referansı; tıklayınca grup toggle */}
        <div className="flex overflow-x-auto no-scrollbar">
          {groups.map((grp) => {
            const cnt = ALL_COLS.filter((c) => c.group === grp && visibleIds.has(c.id)).length;
            if (cnt === 0) return null;
            const color = GROUP_COLORS[grp] ?? "bg-gray-800";
            return (
              <button key={grp} onClick={() => toggleGroup(grp)}
                className={`text-[10px] px-2 py-0.5 whitespace-nowrap border-r border-gray-800/60 ${color} hover:brightness-110 transition`}>
                {grp} <span className="text-gray-400">·{cnt}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ═══ TABLO ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-auto">
        <table
          className="text-xs border-collapse"
          style={{ minWidth: visibleCols.reduce((s, c) => s + colW(c), 0) }}
        >
          <thead className="sticky top-0 z-20">
            {/* Grup başlıkları */}
            <tr>
              {groupSpans.map((gs, i) => (
                <th key={i} colSpan={gs.count}
                  className={`px-1 py-0.5 text-center text-[10px] font-semibold border-b border-gray-700 whitespace-nowrap ${GROUP_COLORS[gs.group] ?? "bg-gray-900"}`}>
                  {gs.group}
                </th>
              ))}
            </tr>
            {/* Sütun isimleri */}
            <tr className="bg-gray-900">
              {visibleCols.map((c) => (
                <th key={c.id}
                  style={{ minWidth: colW(c), maxWidth: colW(c) }}
                  className="px-1.5 py-1 text-left font-medium text-gray-300 whitespace-nowrap border-b border-gray-800 border-r border-gray-800/50">
                  {c.label}
                </th>
              ))}
            </tr>
            {/* ── Sütun filtre satırı ── */}
            <tr className="bg-gray-950">
              {visibleCols.map((c) => (
                <th key={c.id}
                  style={{ minWidth: colW(c), maxWidth: colW(c) }}
                  className="px-0.5 py-0.5 border-b border-gray-700 border-r border-gray-800/50">
                  <input
                    value={colFilters[c.id] ?? ""}
                    onChange={(e) => setColFilters((f) => ({ ...f, [c.id]: e.target.value }))}
                    placeholder="*…*"
                    title={`Wildcard: *=herhangi, ?=tek harf, +=VEYA\nÖrn: *5* | *5?6* | *5*+*6*`}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-[10px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={totalCols} className="text-center py-16 text-gray-500">Yükleniyor…</td></tr>
            ) : filteredRows.length === 0 ? (
              <tr><td colSpan={totalCols} className="text-center py-16 text-gray-500">Veri yok.</td></tr>
            ) : (
              filteredRows.map((m, ri) => (
                <tr key={String(m.id ?? ri)}
                  className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors">
                  {visibleCols.map((c) => {
                    const val = cellVal(m, c);
                    return (
                      <td key={c.id}
                        style={{ minWidth: colW(c), maxWidth: colW(c) }}
                        className={`px-1.5 py-1 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-800/30 font-mono ${cellColor(c, val)}`}
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

      {/* ═══ SAYFALAMA ══════════════════════════════════════════════════════ */}
      <div className="flex-none flex items-center justify-between px-4 py-2 border-t border-gray-800 bg-gray-900/60 text-xs text-gray-400">
        <span>
          Sayfa {page} / {totalPages || 1} · {total.toLocaleString("tr-TR")} maç
          {Object.values(colFilters).some(Boolean) && ` · filtreli: ${filteredRows.length}`}
        </span>
        <div className="flex gap-1.5">
          {[
            { label:"««", disabled: page <= 1, action: () => setPage(1) },
            { label:"‹", disabled: page <= 1, action: () => setPage((p) => p - 1) },
            { label:"›", disabled: page >= totalPages, action: () => setPage((p) => p + 1) },
            { label:"»»", disabled: page >= totalPages, action: () => setPage(totalPages) },
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
