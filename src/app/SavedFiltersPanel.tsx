"use client";

/**
 * 💾 Filtrelerim — kullanıcıya özel, sunucuda saklanan filtre çekmeceleri.
 *
 * Davranış:
 *   • Oturum yok  → "Kaydetmek için giriş yap" uyarısı
 *   • Oturum var  → güncel filtreyi isim verip kaydet + listeden tek tıkla uygula, sil, yeniden adlandır
 *
 * UI, Eşleştirme Paneli'ne benzer: modal/overlay + liste.
 *
 * Veri akışı:
 *   - Parent (MatchTable) bize `captureSnapshot()` ile güncel filtre payload'u verir.
 *   - Seçilen bir kayıt yüklenince `onApplySnapshot(payload)` callback'i çağrılır.
 */
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export interface SavedFilter {
  id: string;
  name: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface SavedFiltersPanelProps {
  open: boolean;
  onClose: () => void;
  /** Güncel filtre durumunun serialize edilmiş özeti. */
  captureSnapshot: () => Record<string, unknown>;
  /** Bir kayıt yüklenince tetiklenir. */
  onApplySnapshot: (payload: Record<string, unknown>, name: string) => void;
}

export function SavedFiltersPanel({
  open,
  onClose,
  captureSnapshot,
  onApplySnapshot,
}: SavedFiltersPanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [items, setItems] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  /** Oturum durumunu senkronize et. */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [open]);

  /** ESC ile kapat. */
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  /** Paneli aç → kayıtları çek. */
  const refreshList = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const resp = await fetch("/api/filters");
      const data = await resp.json();
      if (!data.ok) {
        setErr(data.error || "Yükleme hatası");
        setItems([]);
      } else {
        setItems(data.filters ?? []);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ağ hatası");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    void refreshList();
  }, [open, user, refreshList]);

  const saveCurrent = useCallback(async () => {
    const name = saveName.trim();
    if (!name) return;
    setSaving(true);
    setErr(null);
    try {
      const payload = captureSnapshot();
      const resp = await fetch("/api/filters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, payload }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setErr(data.error || "Kaydetme hatası");
      } else {
        setSaveName("");
        await refreshList();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ağ hatası");
    } finally {
      setSaving(false);
    }
  }, [saveName, captureSnapshot, refreshList]);

  const overwrite = useCallback(async (id: string) => {
    setErr(null);
    try {
      const payload = captureSnapshot();
      const resp = await fetch(`/api/filters?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const data = await resp.json();
      if (!data.ok) setErr(data.error || "Üzerine yazma hatası");
      else await refreshList();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ağ hatası");
    }
  }, [captureSnapshot, refreshList]);

  const rename = useCallback(async (id: string) => {
    const name = renameValue.trim();
    if (!name) { setRenamingId(null); return; }
    setErr(null);
    try {
      const resp = await fetch(`/api/filters?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await resp.json();
      if (!data.ok) setErr(data.error || "Yeniden adlandırma hatası");
      else {
        setRenamingId(null);
        setRenameValue("");
        await refreshList();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ağ hatası");
    }
  }, [renameValue, refreshList]);

  const remove = useCallback(async (id: string, name: string) => {
    if (!confirm(`"${name}" filtresini sil?`)) return;
    setErr(null);
    try {
      const resp = await fetch(`/api/filters?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await resp.json();
      if (!data.ok) setErr(data.error || "Silme hatası");
      else await refreshList();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ağ hatası");
    }
  }, [refreshList]);

  const apply = useCallback((f: SavedFilter) => {
    onApplySnapshot(f.payload, f.name);
    onClose();
  }, [onApplySnapshot, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px] flex items-start sm:items-center justify-center p-2 sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[640px] max-h-[92vh] overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 flex items-center justify-between rounded-t-lg z-10">
          <div className="flex items-center gap-2">
            <span className="text-lg">💾</span>
            <div>
              <div className="font-semibold text-sm">Filtrelerim</div>
              <div className="text-[10px] opacity-90">Sütun aramaları, hane seçimleri ve mod tercihlerinin kayıtlı çekmecesi</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/90 hover:text-white hover:bg-white/10 rounded px-2 py-1 text-sm">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {!authReady ? (
            <div className="text-xs text-gray-500 italic">…</div>
          ) : !user ? (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
              Filtrelerini kaydetmek ve her yerden erişmek için giriş yapman gerekiyor.
              Sağ üstteki <span className="font-semibold">Giriş</span> butonundan e-posta ile giriş yapabilirsin.
            </div>
          ) : (
            <>
              {/* Yeni kaydet */}
              <section className="bg-gray-50 border border-gray-200 rounded p-3">
                <div className="text-xs font-semibold text-gray-800 mb-2">Şu anki filtreyi kaydet</div>
                <div className="flex gap-2">
                  <input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void saveCurrent(); }}
                    placeholder="İsim ver (örn. akşam-ligler-mskod-son2)"
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                    maxLength={80}
                  />
                  <button
                    onClick={saveCurrent}
                    disabled={saving || !saveName.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded font-medium whitespace-nowrap">
                    {saving ? "…" : "Kaydet"}
                  </button>
                </div>
                <div className="text-[10px] text-gray-500 mt-1 leading-snug">
                  Sütun arama kutuları, hane seçimleri, H/A mod override'ları, ⇄ satırı ve tarih filtreleri birlikte kaydedilir.
                </div>
              </section>

              {err && (
                <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                  {err}
                </div>
              )}

              {/* Liste */}
              <section className="border border-gray-200 rounded bg-white">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-gray-700 bg-gray-50 border-b border-gray-200">
                  Kayıtlı filtreler ({items.length})
                </div>
                {loading ? (
                  <div className="p-3 text-xs text-gray-500">Yükleniyor…</div>
                ) : items.length === 0 ? (
                  <div className="p-3 text-xs text-gray-400 italic">Henüz kaydedilmiş filtren yok.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {items.map((f) => (
                      <li key={f.id} className="p-2 hover:bg-gray-50 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          {renamingId === f.id ? (
                            <div className="flex gap-1">
                              <input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void rename(f.id);
                                  else if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                                }}
                                autoFocus
                                className="flex-1 border border-gray-300 rounded px-2 py-0.5 text-xs"
                                maxLength={80}
                              />
                              <button
                                onClick={() => void rename(f.id)}
                                className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2">
                                OK
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => apply(f)}
                                className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 truncate block text-left">
                                {f.name}
                              </button>
                              <div className="text-[10px] text-gray-500">
                                son güncelleme: {new Date(f.updated_at).toLocaleString("tr-TR")}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => apply(f)}
                            className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-1"
                            title="Bu filtreyi uygula">
                            Yükle
                          </button>
                          <button
                            onClick={() => {
                              const ok = window.confirm(
                                `"${f.name}" kayıtlı filtresinin üzerine şu an ekrandaki filtreler yazılacak.\n\nDevam etmek istiyor musunuz?`,
                              );
                              if (!ok) return;
                              void overwrite(f.id);
                            }}
                            className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1"
                            title="Güncel filtreyle üzerine yaz">
                            Üzerine yaz
                          </button>
                          <button
                            onClick={() => { setRenamingId(f.id); setRenameValue(f.name); }}
                            className="text-[10px] bg-gray-200 hover:bg-gray-300 text-gray-800 rounded px-2 py-1"
                            title="Yeniden adlandır">
                            ✎
                          </button>
                          <button
                            onClick={() => void remove(f.id, f.name)}
                            className="text-[10px] bg-red-600 hover:bg-red-700 text-white rounded px-2 py-1"
                            title="Sil">
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
