"use client";

/**
 * 🔍 Tarama Modu — "sıra sıra maç taraması".
 *
 * Arama kutusu **boşken**: ana tablodaki mevcut sayfa (`matches`, en fazla 100 satır).
 * Arama kutusu **doluysun**: aynı tablo filtreleriyle `/api/matches?tarama_q=…` üzerinden
 * **tüm eşleşen küme** içinde veritabanı araması (sayfalama ile biriktirilir).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Match = Record<string, unknown>;

interface ApiMatchesResponse {
  data?: Match[];
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  error?: string;
  detail?: string;
}

interface TaramaModuProps {
  open: boolean;
  onClose: () => void;
  /** Ana tabloda şu an yüklü sayfa (limit 100). */
  matches: Match[];
  /** Tablo filtreleriyle toplam maç (üst bar ile aynı). */
  total: number;
  /** Arama yokken: sonraki tablo sayfası var mı. */
  canLoadMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  /** `/api/matches` için page/limit hariç parametreler (tablo ile aynı filtreler). */
  buildApiParams: () => URLSearchParams;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export function TaramaModu({
  open,
  onClose,
  matches,
  total,
  canLoadMore,
  loadingMore,
  onLoadMore,
  buildApiParams,
}: TaramaModuProps) {
  const [idx, setIdx] = useState(0);
  const [listSearch, setListSearch] = useState("");
  const listSearchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /** Arama aktifken sunucudan gelen satırlar (sayfalar birikir). null = arama yok, `matches` kullan. */
  const [searchRows, setSearchRows] = useState<Match[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchReqGen = useRef(0);

  const searchActive = Boolean(listSearch.trim());

  const displayMatches = useMemo(
    () => (searchActive ? (searchRows ?? []) : matches),
    [searchActive, searchRows, matches],
  );

  const totalDisplay = searchActive ? searchTotal : total;
  const effectiveCanLoadMore = searchActive
    ? searchPage < searchTotalPages
    : canLoadMore;
  const effectiveLoadingMore = searchActive ? searchLoading : loadingMore;

  /** Panel açılınca sıfırla. */
  useEffect(() => {
    if (!open) return;
    setIdx(0);
    setListSearch("");
    setSearchRows(null);
    setSearchTotal(0);
    setSearchTotalPages(0);
    setSearchPage(1);
    setSearchLoading(false);
    setSearchError(null);
  }, [open]);

  /** Sunucu araması (debounce). */
  useEffect(() => {
    if (!open) return;
    const q = listSearch.trim();
    if (!q) {
      setSearchRows(null);
      setSearchTotal(0);
      setSearchTotalPages(0);
      setSearchPage(1);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    const gen = ++searchReqGen.current;
    const ac = new AbortController();
    const t = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const p = buildApiParams();
        p.set("tarama_q", q);
        p.set("page", "1");
        p.set("limit", "100");
        const res = await fetch(`/api/matches?${p}`, { signal: ac.signal });
        const json = (await res.json()) as ApiMatchesResponse;
        if (searchReqGen.current !== gen) return;
        if (!res.ok) {
          setSearchRows([]);
          setSearchTotal(0);
          setSearchTotalPages(0);
          setSearchError(json.error || json.detail || `Hata (${res.status})`);
          return;
        }
        setSearchRows(json.data ?? []);
        setSearchTotal(json.total ?? 0);
        setSearchTotalPages(json.totalPages ?? 0);
        setSearchPage(1);
        setIdx(0);
      } catch (e) {
        if (ac.signal.aborted || searchReqGen.current !== gen) return;
        setSearchRows([]);
        setSearchTotal(0);
        setSearchTotalPages(0);
        setSearchError(e instanceof Error ? e.message : "Ağ hatası");
      } finally {
        if (searchReqGen.current === gen) setSearchLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [open, listSearch, buildApiParams]);

  const loadMoreSearch = useCallback(async () => {
    const q = listSearch.trim();
    if (!q || searchLoading || searchPage >= searchTotalPages) return;
    const nextPage = searchPage + 1;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const p = buildApiParams();
      p.set("tarama_q", q);
      p.set("page", String(nextPage));
      p.set("limit", "100");
      const res = await fetch(`/api/matches?${p}`);
      const json = (await res.json()) as ApiMatchesResponse;
      if (!res.ok) {
        setSearchError(json.error || json.detail || `Hata (${res.status})`);
        return;
      }
      setSearchRows((prev) => [...(prev ?? []), ...(json.data ?? [])]);
      setSearchPage(nextPage);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Ağ hatası");
    } finally {
      setSearchLoading(false);
    }
  }, [listSearch, searchLoading, searchPage, searchTotalPages, buildApiParams]);

  /** Liste uzunluğu / seçim sınırı. */
  useEffect(() => {
    if (idx >= displayMatches.length) setIdx(Math.max(0, displayMatches.length - 1));
  }, [displayMatches.length, idx]);

  /** Seçili satırı görünür kaydır. */
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-tarama-idx="${idx}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [idx, open]);

  /** Klavye (arama kutusundayken devre dışı). */
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const inInput = t && ["INPUT", "TEXTAREA"].includes(t.tagName);
      if (inInput) return;
      const fl = displayMatches.length;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        setIdx((i) => {
          const next = i + 1;
          if (next < fl) return next;
          if (fl > 0 && i === fl - 1 && effectiveCanLoadMore && !effectiveLoadingMore) {
            if (searchActive) void loadMoreSearch();
            else onLoadMore();
          }
          return Math.max(0, fl - 1);
        });
      } else if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "PageDown") {
        e.preventDefault();
        setIdx((i) => (fl <= 0 ? 0 : Math.min(fl - 1, i + 10)));
      } else if (e.key === "PageUp") {
        e.preventDefault();
        setIdx((i) => (fl <= 0 ? 0 : Math.max(0, i - 10)));
      } else if (e.key === "Home") {
        e.preventDefault();
        setIdx(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setIdx(Math.max(0, fl - 1));
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [
    open,
    onClose,
    displayMatches.length,
    effectiveCanLoadMore,
    effectiveLoadingMore,
    searchActive,
    loadMoreSearch,
    onLoadMore,
  ]);

  const current = useMemo<Match | null>(
    () => (displayMatches[idx] ?? null),
    [displayMatches, idx],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[250] bg-gray-900/80 backdrop-blur-sm flex flex-col"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex-none bg-gradient-to-r from-slate-800 to-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-lg">🔍</span>
          <div>
            <div className="text-sm font-semibold">Tarama Modu</div>
            <div className="text-[10px] opacity-70">
              ↑/↓ veya J/K: geç · Esc: kapat · PageUp/PageDown: 10&apos;lu
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-right">
            <span className="text-emerald-400 font-semibold">{displayMatches.length > 0 ? idx + 1 : 0}</span>
            <span className="text-slate-400"> / </span>
            <span className="text-slate-200">{displayMatches.length.toLocaleString("tr-TR")}</span>
            {searchActive && totalDisplay > displayMatches.length && (
              <span className="text-slate-500 ml-1">({totalDisplay.toLocaleString("tr-TR")} eşleşme)</span>
            )}
            {!searchActive && total > matches.length && (
              <span className="text-slate-500 ml-1">({total.toLocaleString("tr-TR")} toplam)</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-1 text-xs">
            Kapat ✕
          </button>
        </div>
      </div>

      <div className="flex-none flex flex-col gap-1 px-3 py-2 border-b border-slate-700 bg-slate-800/95">
        <div className="flex items-center gap-2">
          <label htmlFor="tarama-mac-ara" className="text-[10px] text-slate-400 shrink-0 font-medium uppercase tracking-wide">
            Maç ara
          </label>
          <input
            id="tarama-mac-ara"
            ref={listSearchRef}
            type="search"
            value={listSearch}
            onChange={(e) => {
              setListSearch(e.target.value);
              setIdx(0);
            }}
            placeholder="Takım, lig, kod, id… (yavaşsa önce tarih/lig ile daraltın)"
            className="flex-1 min-w-0 rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            autoComplete="off"
            spellCheck={false}
          />
          {listSearch.trim() ? (
            <button
              type="button"
              onClick={() => { setListSearch(""); setIdx(0); listSearchRef.current?.focus(); }}
              className="shrink-0 text-[10px] text-slate-300 hover:text-white px-2 py-1 rounded border border-slate-600 hover:bg-slate-700">
              Temizle
            </button>
          ) : null}
        </div>
        <p className="text-[9px] text-slate-500 leading-snug pl-[52px]">
          Boşlukla birden fazla kelime: hepsi aynı maçta (takım/lig/kod metinlerinde) geçmeli. Barcelona - Real Madrid veya Barcelona vs Real yazılabilir (tire/vs kelimelere bölünür). Üstteki filtrelerle küme dar olunca daha hızlıdır.
        </p>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div
          ref={listRef}
          className="w-[320px] shrink-0 border-r border-slate-700 overflow-y-auto bg-slate-900"
        >
          {searchError && (
            <div className="p-3 text-[11px] text-red-200 bg-red-950/40 border-b border-red-900/50">
              {searchError}
            </div>
          )}
          {!searchActive && matches.length === 0 ? (
            <div className="p-4 text-xs text-slate-400 italic">
              Eşleşen maç yok. Önce filtre uygula.
            </div>
          ) : searchActive && searchLoading && (searchRows?.length ?? 0) === 0 ? (
            <div className="p-4 text-xs text-slate-400">Veritabanında aranıyor…</div>
          ) : searchActive && !searchLoading && displayMatches.length === 0 ? (
            <div className="p-4 text-xs text-amber-200/90 italic">
              Bu filtrelerle “{listSearch.trim()}” için veritabanında maç bulunamadı.
            </div>
          ) : (
            <ul>
              {displayMatches.map((m, i) => {
                const selected = i === idx;
                const t1 = str(m.t1);
                const t2 = str(m.t2);
                const iy = str(m.sonuc_iy);
                const ms = str(m.sonuc_ms);
                const tarih = str(m.tarih);
                const saat = str(m.saat);
                return (
                  <li
                    key={`${String(m.id ?? "x")}-${i}`}
                    data-tarama-idx={i}
                    onClick={() => setIdx(i)}
                    className={`cursor-pointer px-2 py-1.5 border-b border-slate-800 text-[11px] ${
                      selected
                        ? "bg-emerald-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}>
                    <div className="flex items-center gap-1">
                      <span className={`font-mono ${selected ? "text-emerald-100" : "text-slate-500"}`}>
                        {String(i + 1).padStart(4, " ")}
                      </span>
                      <span className={`font-mono ${selected ? "text-emerald-100" : "text-slate-500"}`}>
                        {tarih}{saat ? ` ${saat}` : ""}
                      </span>
                    </div>
                    <div className="font-medium truncate">{t1} - {t2}</div>
                    {(iy || ms) && (
                      <div className={`font-mono ${selected ? "text-emerald-100" : "text-amber-300"}`}>
                        {iy || "?"} / {ms || "?"}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {effectiveCanLoadMore && (
            <div className="p-2 sticky bottom-0 bg-slate-900 border-t border-slate-700">
              <button
                type="button"
                onClick={() => (searchActive ? void loadMoreSearch() : onLoadMore())}
                disabled={effectiveLoadingMore}
                className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-[11px] px-2 py-1.5 rounded">
                {effectiveLoadingMore ? "Yükleniyor…" : "+ Sonrakini yükle"}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 overflow-y-auto bg-slate-100">
          {current ? (
            <DetailCard match={current} />
          ) : (
            <div className="p-8 text-sm text-slate-500 italic">Maç seçilmedi.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Tek maç detay kartı — büyük, okunur, tüm temel alanlar. */
function DetailCard({ match }: { match: Match }) {
  const t1 = str(match.t1);
  const t2 = str(match.t2);
  const iy = str(match.sonuc_iy);
  const ms = str(match.sonuc_ms);
  const tarih = str(match.tarih);
  const saat = str(match.saat);
  const lig = str(match.lig_adi);
  const ligKodu = str(match.lig_kodu);
  const altLig = str(match.alt_lig);
  const gun = str(match.gun);
  const macId = str(match.id);
  const t1i = str(match.t1i);
  const t2i = str(match.t2i);
  const kodMs = str(match.kod_ms);
  const kodIy = str(match.kod_iy);
  const kodCs = str(match.kod_cs);
  const kodAu = str(match.kod_au);
  const mbs = str(match.MB ?? match.mac_suffix4 ?? match.mbs);
  const hakem = str(match.hakem);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <div className="text-xs text-slate-500 font-mono mb-1">
          {tarih}{saat ? ` · ${saat}` : ""}{gun ? ` · ${gun}` : ""}
        </div>
        <div className="text-xs text-slate-600 mb-2">
          <span className="font-semibold">{lig}</span>
          {ligKodu && <span className="text-slate-400"> · {ligKodu}</span>}
          {altLig && <span className="text-slate-400"> · {altLig}</span>}
        </div>
        <div className="text-2xl font-semibold text-slate-900 flex items-baseline gap-3">
          <span className="flex-1 text-right truncate">{t1 || "—"}</span>
          <span className="font-mono text-slate-400 text-lg">vs</span>
          <span className="flex-1 truncate">{t2 || "—"}</span>
        </div>
        {(iy || ms) && (
          <div className="mt-3 text-center">
            <div className="inline-flex items-baseline gap-3 bg-white border border-slate-300 rounded-lg px-4 py-2 shadow-sm">
              <div className="text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400">İY</div>
                <div className="text-xl font-mono font-semibold text-amber-700">{iy || "?"}</div>
              </div>
              <div className="w-px h-8 bg-slate-300" />
              <div className="text-center">
                <div className="text-[9px] uppercase tracking-wide text-slate-400">MS</div>
                <div className="text-xl font-mono font-semibold text-emerald-700">{ms || "?"}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        <CodeBox label="Maç ID" value={macId} color="bg-blue-50 border-blue-300 text-blue-900" mono />
        <CodeBox label="MS Kod" value={kodMs} color="bg-orange-50 border-orange-300 text-orange-900" mono />
        <CodeBox label="İY Kod" value={kodIy} color="bg-purple-50 border-purple-300 text-purple-900" mono />
        <CodeBox label="ÇŞ Kod" value={kodCs} color="bg-pink-50 border-pink-300 text-pink-900" mono />
        <CodeBox label="A/Ü Kod" value={kodAu} color="bg-teal-50 border-teal-300 text-teal-900" mono />
        <CodeBox label="MBS" value={mbs} color="bg-slate-50 border-slate-300 text-slate-900" mono />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        <CodeBox label="T1 ID" value={t1i} color="bg-slate-50 border-slate-300 text-slate-700" mono />
        <CodeBox label="T2 ID" value={t2i} color="bg-slate-50 border-slate-300 text-slate-700" mono />
        {hakem && <CodeBox label="Hakem" value={hakem} color="bg-slate-50 border-slate-300 text-slate-700" />}
      </div>

      <details className="bg-white border border-slate-200 rounded">
        <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100">
          Tüm alanlar ▾
        </summary>
        <div className="p-3 overflow-x-auto">
          <table className="w-full text-[11px]">
            <tbody>
              {Object.entries(match)
                .filter(([k]) => !k.startsWith("__"))
                .map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-100">
                    <td className="text-slate-500 pr-3 py-0.5 font-mono whitespace-nowrap">{k}</td>
                    <td className="text-slate-800 py-0.5 font-mono break-all">
                      {v === null || v === undefined ? <span className="text-slate-300 italic">null</span> : String(v)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function CodeBox({
  label, value, color, mono,
}: { label: string; value: string; color: string; mono?: boolean }) {
  return (
    <div className={`rounded border px-2 py-1.5 ${color}`}>
      <div className="text-[9px] uppercase tracking-wide opacity-70">{label}</div>
      <div className={`text-sm ${mono ? "font-mono" : ""} font-semibold truncate`}>
        {value || <span className="opacity-40">—</span>}
      </div>
    </div>
  );
}
