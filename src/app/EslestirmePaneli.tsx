"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// Eşleştirme Paneli — adam'ın "kod son 2/3/4'e göre kombinasyon analizi" isteği
//
// Kullanıcı şunu yapar:
//   1) Boyut seç (Maç Kodu / MS Kod / CS Kod / İY Kod / AÜ Kod) × son N (2/3/4/5)
//   2) Kapsam seç (İY skor, MS skor, tarih aralığı — opsiyonel)
//   3) "Hesapla" → API: /api/analyze → RPC: analyze_combos()
//   4) Sonuçlar: toplam, benzersiz, tekrar eden
//   5) Aksiyonlar: Tümü / Tekrarlar / Benzersizler → tabloyu süz
//   6) Kombinasyonu isimlendirerek kaydet (localStorage)
// ═══════════════════════════════════════════════════════════════════════════

export type EslestirmeCol = "id" | "kod_ms" | "kod_cs" | "kod_iy" | "kod_au";

export interface EslestirmeDim {
  col: EslestirmeCol;
  n: number;
}

export interface EslestirmeScope {
  sonuc_iy?: string;
  sonuc_ms?: string;
  tarih_from?: string;
  tarih_to?: string;
  lig_adi?: string;
  alt_lig_id?: number;
}

export interface EslestirmeResult {
  ok: boolean;
  error?: string;
  total: number;
  uniqueCount: number;
  repeatCount: number;
  repeatMatches: number;
  combos: Array<{ combo: string; cnt: number; ids: number[] }>;
  truncated: boolean;
  totalCombos: number;
  dims: string[];
}

export interface SavedCombo {
  name: string;
  dims: EslestirmeDim[];
}

const DIM_COLS: Array<{ col: EslestirmeCol; label: string; color: string }> = [
  { col: "id",     label: "Maç Kodu", color: "bg-blue-100 border-blue-400 text-blue-900" },
  { col: "kod_ms", label: "MS Kod",   color: "bg-orange-100 border-orange-400 text-orange-900" },
  { col: "kod_cs", label: "ÇŞ Kod",   color: "bg-pink-100 border-pink-400 text-pink-900" },
  { col: "kod_iy", label: "İY Kod",   color: "bg-purple-100 border-purple-400 text-purple-900" },
  { col: "kod_au", label: "A/Ü Kod",  color: "bg-teal-100 border-teal-400 text-teal-900" },
];

const DIGIT_CHOICES = [2, 3, 4, 5] as const;
const LS_SAVED_COMBOS = "om_eslestirme_saved_v1";

function lsGet<T>(k: string, d: T): T {
  if (typeof window === "undefined") return d;
  try {
    const s = window.localStorage.getItem(k);
    return s ? (JSON.parse(s) as T) : d;
  } catch {
    return d;
  }
}
function lsSet<T>(k: string, v: T): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(k, JSON.stringify(v)); } catch { /* noop */ }
}

interface EslestirmePaneliProps {
  open: boolean;
  onClose: () => void;
  /** Paneli açarken mevcut tablo filtrelerinin kopyası — "Mevcut filtreler" kapsamı için */
  currentScope: EslestirmeScope;
  /** Tekrarları/Benzersizleri tabloda göstermek için: id listesi uygula */
  onApplyIdList: (ids: number[], label: string) => void;
}

export function EslestirmePaneli({
  open,
  onClose,
  currentScope,
  onApplyIdList,
}: EslestirmePaneliProps) {
  // Seçili boyutlar: her hücre {col:n} key'iyle
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [useCurrentScope, setUseCurrentScope] = useState(true);
  // Manuel kapsam (useCurrentScope=false ise)
  const [manualIy, setManualIy] = useState("");
  const [manualMs, setManualMs] = useState("");
  const [manualTarihFrom, setManualTarihFrom] = useState("");
  const [manualTarihTo, setManualTarihTo] = useState("");

  const [result, setResult] = useState<EslestirmeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [saveName, setSaveName] = useState("");
  const [savedCombos, setSavedCombos] = useState<SavedCombo[]>(
    () => lsGet<SavedCombo[]>(LS_SAVED_COMBOS, [])
  );

  const modalRef = useRef<HTMLDivElement>(null);

  // Açılınca seçili set'i localStorage'dan oku (sonuncu kombinasyon)
  useEffect(() => {
    if (!open) {
      setResult(null);
      setErrorMsg(null);
    }
  }, [open]);

  // ESC ile kapat
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  const scope: EslestirmeScope = useMemo(() => {
    if (useCurrentScope) return currentScope;
    return {
      sonuc_iy: manualIy.trim() || undefined,
      sonuc_ms: manualMs.trim() || undefined,
      tarih_from: manualTarihFrom.trim() || undefined,
      tarih_to: manualTarihTo.trim() || undefined,
    };
  }, [useCurrentScope, currentScope, manualIy, manualMs, manualTarihFrom, manualTarihTo]);

  const dims: EslestirmeDim[] = useMemo(() => {
    const out: EslestirmeDim[] = [];
    for (const { col } of DIM_COLS) {
      for (const n of DIGIT_CHOICES) {
        if (selected.has(`${col}:${n}`)) out.push({ col, n });
      }
    }
    return out;
  }, [selected]);

  const toggleDim = useCallback((col: EslestirmeCol, n: number) => {
    const key = `${col}:${n}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    setResult(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setResult(null);
  }, []);

  const runAnalyze = useCallback(async () => {
    setErrorMsg(null);
    if (dims.length === 0) {
      setErrorMsg("En az bir boyut seçmelisin.");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dims, scope }),
      });
      const data = (await resp.json()) as EslestirmeResult;
      if (!data.ok) {
        setErrorMsg(data.error || "Bilinmeyen hata");
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Ağ hatası");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [dims, scope]);

  // Tüm / Tekrarlar / Benzersizler → id listesini topla, callback ile tabloya uygula
  const applyFilterFromResult = useCallback((mode: "all" | "repeat" | "unique") => {
    if (!result) return;
    const ids: number[] = [];
    for (const c of result.combos) {
      if (mode === "all") ids.push(...c.ids);
      else if (mode === "repeat" && c.cnt >= 2) ids.push(...c.ids);
      else if (mode === "unique" && c.cnt === 1) ids.push(...c.ids);
    }
    const label =
      mode === "all" ? `Eşleştirme: tüm ${ids.length}` :
      mode === "repeat" ? `Eşleştirme: tekrar ${ids.length}` :
      `Eşleştirme: benzersiz ${ids.length}`;
    onApplyIdList(ids, label);
    onClose();
  }, [result, onApplyIdList, onClose]);

  const saveCurrent = useCallback(() => {
    const name = saveName.trim();
    if (!name || dims.length === 0) return;
    setSavedCombos((prev) => {
      const filtered = prev.filter((s) => s.name !== name);
      const updated = [{ name, dims }, ...filtered].slice(0, 20);
      lsSet(LS_SAVED_COMBOS, updated);
      return updated;
    });
    setSaveName("");
  }, [saveName, dims]);

  const loadSaved = useCallback((s: SavedCombo) => {
    const next = new Set<string>();
    for (const d of s.dims) next.add(`${d.col}:${d.n}`);
    setSelected(next);
    setResult(null);
  }, []);

  const deleteSaved = useCallback((name: string) => {
    setSavedCombos((prev) => {
      const updated = prev.filter((s) => s.name !== name);
      lsSet(LS_SAVED_COMBOS, updated);
      return updated;
    });
  }, []);

  if (!open) return null;

  const hasScope = useCurrentScope
    ? Boolean(currentScope.sonuc_iy || currentScope.sonuc_ms || currentScope.tarih_from || currentScope.tarih_to || currentScope.lig_adi || currentScope.alt_lig_id)
    : Boolean(manualIy || manualMs || manualTarihFrom || manualTarihTo);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px] flex items-start sm:items-center justify-center p-2 sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-2xl w-full max-w-[940px] max-h-[94vh] overflow-y-auto flex flex-col"
      >
        {/* Başlık */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 flex items-center justify-between rounded-t-lg z-10">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <div>
              <div className="font-semibold text-sm">Eşleştirme Paneli</div>
              <div className="text-[10px] opacity-90">Boyutları seç → hesapla → tekrar/benzersiz maçları listele</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white hover:bg-white/10 rounded px-2 py-1 text-sm"
            title="Kapat (Esc)">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Kapsam */}
          <section className="bg-gray-50 border border-gray-200 rounded p-3">
            <div className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span>1. Kapsam</span>
              {hasScope && <span className="text-emerald-700 text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded">aktif</span>}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  checked={useCurrentScope}
                  onChange={() => setUseCurrentScope(true)}
                />
                <span>Tablodaki mevcut filtreleri kullan</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  checked={!useCurrentScope}
                  onChange={() => setUseCurrentScope(false)}
                />
                <span>Manuel kapsam</span>
              </label>
            </div>

            {useCurrentScope ? (
              <div className="text-[11px] text-gray-700 font-mono bg-white rounded border border-gray-200 p-2 leading-relaxed">
                {hasScope ? (
                  <>
                    {currentScope.sonuc_iy && <div>İY skor: <span className="text-emerald-700 font-semibold">{currentScope.sonuc_iy}</span></div>}
                    {currentScope.sonuc_ms && <div>MS skor: <span className="text-emerald-700 font-semibold">{currentScope.sonuc_ms}</span></div>}
                    {currentScope.tarih_from && <div>Tarih: {currentScope.tarih_from} → {currentScope.tarih_to || "…"}</div>}
                    {currentScope.lig_adi && <div>Lig: {currentScope.lig_adi}</div>}
                    {currentScope.alt_lig_id != null && <div>Alt Lig ID: {currentScope.alt_lig_id}</div>}
                  </>
                ) : (
                  <span className="text-gray-400 italic">Filtre yok — tüm veritabanı analiz edilir (yavaş olabilir)</span>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-600">İlk Yarı</label>
                  <input value={manualIy} onChange={(e) => setManualIy(e.target.value)} placeholder="1-0"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600">Maç Sonu</label>
                  <input value={manualMs} onChange={(e) => setManualMs(e.target.value)} placeholder="3-0"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600">Tarih (başl.)</label>
                  <input type="date" value={manualTarihFrom} onChange={(e) => setManualTarihFrom(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600">Tarih (bit.)</label>
                  <input type="date" value={manualTarihTo} onChange={(e) => setManualTarihTo(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs" />
                </div>
              </div>
            )}
          </section>

          {/* Boyut Seçimi */}
          <section className="bg-gray-50 border border-gray-200 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-gray-800">2. Boyutlar <span className="text-gray-500 font-normal">({dims.length} seçili)</span></div>
              {selected.size > 0 && (
                <button onClick={clearSelection} className="text-[11px] text-red-600 hover:text-red-800">
                  Seçimi temizle
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white border-b border-gray-200">
                    <th className="text-left px-2 py-1.5 text-gray-600 font-medium">Kod</th>
                    {DIGIT_CHOICES.map((n) => (
                      <th key={n} className="text-center px-2 py-1.5 text-gray-600 font-medium w-16">
                        Son {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DIM_COLS.map(({ col, label, color }) => (
                    <tr key={col} className="border-b border-gray-100 hover:bg-white">
                      <td className="px-2 py-1.5">
                        <span className={`inline-block border rounded px-2 py-0.5 text-[11px] font-semibold ${color}`}>
                          {label}
                        </span>
                      </td>
                      {DIGIT_CHOICES.map((n) => {
                        const key = `${col}:${n}`;
                        const isSel = selected.has(key);
                        return (
                          <td key={n} className="text-center px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() => toggleDim(col, n)}
                              className={`w-9 h-7 rounded border text-[11px] font-mono font-semibold transition ${
                                isSel
                                  ? "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                                  : "bg-white border-gray-300 text-gray-500 hover:border-indigo-400 hover:bg-indigo-50"
                              }`}
                              title={isSel ? `Kaldır: ${label} son ${n}` : `Ekle: ${label} son ${n}`}
                            >
                              {isSel ? "✓" : `−`}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dims.length > 0 && (
              <div className="mt-2 text-[11px] text-gray-600">
                <span className="font-semibold">Eşleştirilecek anahtar:</span>{" "}
                <span className="font-mono text-indigo-700">
                  {dims.map((d) => `${DIM_COLS.find((x) => x.col === d.col)?.label}-son${d.n}`).join(" + ")}
                </span>
              </div>
            )}
          </section>

          {/* Hesapla + Sonuç */}
          <section className="bg-white border border-gray-300 rounded p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={runAnalyze}
                disabled={loading || dims.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                {loading ? "Hesaplanıyor…" : "🔢 Hesapla"}
              </button>
              {errorMsg && (
                <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                  {errorMsg}
                </div>
              )}
            </div>

            {result && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatCard label="Toplam maç" value={result.total} color="bg-gray-100 text-gray-800" />
                  <StatCard label="Benzersiz combo" value={result.totalCombos} color="bg-blue-100 text-blue-800" />
                  <StatCard label="Tekrar eden combo" value={result.repeatCount} color="bg-orange-100 text-orange-800" />
                  <StatCard label="Tekrar eden maç" value={result.repeatMatches} color="bg-red-100 text-red-800" />
                </div>

                {result.truncated && (
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    ⚠︎ Çok fazla kombinasyon var; ilk 2000 gösteriliyor. Filtreyi daraltarak tekrar deneyebilirsin.
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => applyFilterFromResult("all")}
                    className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded">
                    📋 Tümünü tabloda listele ({result.total})
                  </button>
                  <button
                    onClick={() => applyFilterFromResult("repeat")}
                    disabled={result.repeatMatches === 0}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded disabled:opacity-40">
                    🔁 Sadece tekrar edenler ({result.repeatMatches})
                  </button>
                  <button
                    onClick={() => applyFilterFromResult("unique")}
                    disabled={result.uniqueCount === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded disabled:opacity-40">
                    ⭐ Sadece benzersiz olanlar ({result.uniqueCount})
                  </button>
                </div>

                {/* İlk 30 kombinasyon önizleme */}
                {result.combos.length > 0 && (
                  <details className="border border-gray-200 rounded bg-gray-50">
                    <summary className="cursor-pointer px-2 py-1.5 text-[11px] font-semibold text-gray-700 select-none">
                      En çok tekrar eden ilk {Math.min(30, result.combos.length)} kombinasyon ▾
                    </summary>
                    <div className="p-2 overflow-x-auto">
                      <table className="w-full text-[11px] font-mono">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-300">
                            <th className="text-left px-1 py-0.5">#</th>
                            <th className="text-left px-1 py-0.5">Kombinasyon</th>
                            <th className="text-right px-1 py-0.5">Maç Sayısı</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.combos.slice(0, 30).map((c, i) => (
                            <tr key={c.combo} className={`border-b border-gray-200 ${c.cnt >= 2 ? "bg-orange-50" : ""}`}>
                              <td className="px-1 py-0.5 text-gray-400">{i + 1}</td>
                              <td className="px-1 py-0.5 text-indigo-900">{c.combo}</td>
                              <td className="px-1 py-0.5 text-right font-semibold">{c.cnt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            )}
          </section>

          {/* Kayıt & Yükle */}
          <section className="bg-gray-50 border border-gray-200 rounded p-3">
            <div className="text-xs font-semibold text-gray-800 mb-2">3. Kombinasyonu kaydet / yükle</div>
            <div className="flex gap-2 flex-wrap mb-2">
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="İsim ver (örn. Hafta sonu analizi)"
                className="flex-1 min-w-[180px] border border-gray-300 rounded px-2 py-1 text-xs"
              />
              <button
                onClick={saveCurrent}
                disabled={!saveName.trim() || dims.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded disabled:opacity-40">
                💾 Kaydet
              </button>
            </div>
            {savedCombos.length > 0 ? (
              <div className="space-y-1">
                {savedCombos.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 bg-white border border-gray-200 rounded px-2 py-1">
                    <button
                      onClick={() => loadSaved(s)}
                      className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold truncate flex-1 text-left">
                      {s.name}
                    </button>
                    <span className="text-[10px] text-gray-500 font-mono truncate">
                      {s.dims.map((d) => `${d.col.replace("kod_", "").replace("id", "maç")}/${d.n}`).join(" + ")}
                    </span>
                    <button
                      onClick={() => deleteSaved(s.name)}
                      className="text-red-500 hover:text-red-700 text-xs"
                      title="Sil">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-gray-400 italic">Henüz kaydedilmiş kombinasyon yok</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded p-2 ${color}`}>
      <div className="text-[10px] opacity-80">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value.toLocaleString("tr-TR")}</div>
    </div>
  );
}
