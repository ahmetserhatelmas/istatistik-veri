"use client";

import { useCallback, useEffect, useState } from "react";

interface Match {
  id: number;
  tarih: string;
  saat: string | null;
  lig_adi: string | null;
  alt_lig_adi: string | null;
  t1: string | null;
  t2: string | null;
  sonuc_iy: string | null;
  sonuc_ms: string | null;
  ms1: string | null;
  msx: string | null;
  ms2: string | null;
  iy1: string | null;
  iyx: string | null;
  iy2: string | null;
  a: string | null;
  u: string | null;
  kg_var: string | null;
  kg_yok: string | null;
  hakem: string | null;
  t1_antrenor: string | null;
  t2_antrenor: string | null;
  kod_ms: number | null;
  kod_cs: number | null;
  kod_iy: number | null;
  mac_suffix4: string | null;
  mac_suffix3: string | null;
  mac_suffix2: string | null;
  ft1: number | null;
  ft2: number | null;
  ht1: number | null;
  ht2: number | null;
}

interface ApiResponse {
  data: Match[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [filters, setFilters] = useState({
    tarih_from: "",
    tarih_to: "",
    lig: "",
    takim: "",
    sonuc_iy: "",
    sonuc_ms: "",
    hakem: "",
    suffix4: "",
    suffix3: "",
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    Object.entries(appliedFilters).forEach(([k, v]) => {
      if (v.trim()) params.set(k, v.trim());
    });
    try {
      const res = await fetch(`/api/matches?${params}`);
      const json: ApiResponse = await res.json();
      setMatches(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 0);
    } catch {
      setMatches([]);
    }
    setLoading(false);
  }, [page, appliedFilters]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  function applyFilters() {
    setPage(1);
    setAppliedFilters({ ...filters });
  }

  function clearFilters() {
    const empty = {
      tarih_from: "",
      tarih_to: "",
      lig: "",
      takim: "",
      sonuc_iy: "",
      sonuc_ms: "",
      hakem: "",
      suffix4: "",
      suffix3: "",
    };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">
          Oran Merkezi — İddaa Veri Platformu
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {total.toLocaleString("tr-TR")} maç kayıtlı
        </p>
      </header>

      <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <input
            type="date"
            placeholder="Tarih (başlangıç)"
            value={filters.tarih_from}
            onChange={(e) => setFilters((f) => ({ ...f, tarih_from: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="date"
            placeholder="Tarih (bitiş)"
            value={filters.tarih_to}
            onChange={(e) => setFilters((f) => ({ ...f, tarih_to: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            placeholder="Lig"
            value={filters.lig}
            onChange={(e) => setFilters((f) => ({ ...f, lig: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            placeholder="Takım"
            value={filters.takim}
            onChange={(e) => setFilters((f) => ({ ...f, takim: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            placeholder="IY Skor (ör. 2-2)"
            value={filters.sonuc_iy}
            onChange={(e) => setFilters((f) => ({ ...f, sonuc_iy: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            placeholder="MS Skor (ör. 1-0)"
            value={filters.sonuc_ms}
            onChange={(e) => setFilters((f) => ({ ...f, sonuc_ms: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            placeholder="Hakem"
            value={filters.hakem}
            onChange={(e) => setFilters((f) => ({ ...f, hakem: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            placeholder="Son 4 hane"
            value={filters.suffix4}
            onChange={(e) => setFilters((f) => ({ ...f, suffix4: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            placeholder="Son 3 hane"
            value={filters.suffix3}
            onChange={(e) => setFilters((f) => ({ ...f, suffix3: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              Filtrele
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition"
            >
              Temizle
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 sticky top-0">
            <tr>
              {[
                "Maç ID",
                "Tarih",
                "Saat",
                "Lig",
                "Ev Sahibi",
                "Deplasman",
                "IY",
                "MS",
                "MS1",
                "MSX",
                "MS2",
                "IY1",
                "IYX",
                "IY2",
                "2.5A",
                "2.5Ü",
                "KG V",
                "KG Y",
                "Hakem",
                "S4",
                "S3",
              ].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={21} className="text-center py-12 text-gray-500">
                  Yükleniyor...
                </td>
              </tr>
            ) : matches.length === 0 ? (
              <tr>
                <td colSpan={21} className="text-center py-12 text-gray-500">
                  Veri yok. Önce sync yapın veya filtreleri değiştirin.
                </td>
              </tr>
            ) : (
              matches.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition"
                >
                  <td className="px-3 py-2 font-mono text-xs">{m.id}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{m.tarih}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{m.saat?.slice(0, 5)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {m.lig_adi}
                    {m.alt_lig_adi ? ` / ${m.alt_lig_adi}` : ""}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-medium">{m.t1}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-medium">{m.t2}</td>
                  <td className="px-3 py-2 font-mono text-yellow-400">{m.sonuc_iy}</td>
                  <td className="px-3 py-2 font-mono text-green-400">{m.sonuc_ms}</td>
                  <td className="px-3 py-2 font-mono">{m.ms1}</td>
                  <td className="px-3 py-2 font-mono">{m.msx}</td>
                  <td className="px-3 py-2 font-mono">{m.ms2}</td>
                  <td className="px-3 py-2 font-mono">{m.iy1}</td>
                  <td className="px-3 py-2 font-mono">{m.iyx}</td>
                  <td className="px-3 py-2 font-mono">{m.iy2}</td>
                  <td className="px-3 py-2 font-mono">{m.a}</td>
                  <td className="px-3 py-2 font-mono">{m.u}</td>
                  <td className="px-3 py-2 font-mono">{m.kg_var}</td>
                  <td className="px-3 py-2 font-mono">{m.kg_yok}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{m.hakem}</td>
                  <td className="px-3 py-2 font-mono text-xs text-blue-400">
                    {m.mac_suffix4}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-blue-400">
                    {m.mac_suffix3}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <span className="text-sm text-gray-400">
            Sayfa {page} / {totalPages} ({total.toLocaleString("tr-TR")} maç)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 px-3 py-1 rounded text-sm transition"
            >
              Önceki
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 px-3 py-1 rounded text-sm transition"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
