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
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { summarizeSavedFilterPayload } from "@/lib/saved-filter-summary";

const FOLDER_MAX = 60;
/** Tarayıcıda tutulan grup adları (sunucuda filtre yokken de seçilebilsin) */
const LS_FILTER_GROUP_NAMES = "om_saved_filter_group_names_v1";

export interface SavedFilter {
  id: string;
  name: string;
  /** Boş veya yok = grupsuz */
  folder?: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function normalizeFolderInput(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return t.length > FOLDER_MAX ? t.slice(0, FOLDER_MAX) : t;
}

function folderKey(f: SavedFilter): string {
  return (f.folder ?? "").trim();
}

function readGroupNamesFromLs(): string[] {
  try {
    const raw = localStorage.getItem(LS_FILTER_GROUP_NAMES);
    if (!raw) return [];
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const x of j) {
      const n = normalizeFolderInput(String(x));
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
    return out.sort((a, b) => a.localeCompare(b, "tr", { sensitivity: "base" }));
  } catch {
    return [];
  }
}

function writeGroupNamesToLs(names: string[]) {
  const seen = new Set<string>();
  const norm: string[] = [];
  for (const x of names) {
    const n = normalizeFolderInput(String(x));
    if (!n || seen.has(n)) continue;
    seen.add(n);
    norm.push(n);
  }
  norm.sort((a, b) => a.localeCompare(b, "tr", { sensitivity: "base" }));
  localStorage.setItem(LS_FILTER_GROUP_NAMES, JSON.stringify(norm));
}

function SavedFilterSummary({ payload }: { payload: Record<string, unknown> }) {
  const lines = summarizeSavedFilterPayload(payload, { maxColEntries: 20, maxLineChars: 80 });
  const full = lines.join("\n");
  return (
    <div
      className="text-[9px] text-slate-600 leading-snug mt-1 space-y-0.5 max-h-[5rem] overflow-y-auto pr-0.5 border-t border-slate-100/80 pt-1"
      title={full}>
      {lines.map((line, i) => (
        <div key={i} className="break-words">
          {line}
        </div>
      ))}
    </div>
  );
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
  /** Kayıt sırasında seçilen grup; "" = Grupsuz */
  const [saveFolderSelect, setSaveFolderSelect] = useState("");
  const [presetGroupNames, setPresetGroupNames] = useState<string[]>([]);
  const [newGroupInput, setNewGroupInput] = useState("");
  const [saving, setSaving] = useState(false);
  /** Gruplarım chip’inde yeniden adlandırma: normalize edilmiş eski ad */
  const [renamingPreset, setRenamingPreset] = useState<string | null>(null);
  const [renamingPresetValue, setRenamingPresetValue] = useState("");
  const [renamingPresetBusy, setRenamingPresetBusy] = useState(false);
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

  /** ESC: önce grup yeniden adlandırmayı iptal et, yoksa paneli kapat. */
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (renamingPreset !== null) {
        setRenamingPreset(null);
        setRenamingPresetValue("");
        e.preventDefault();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose, renamingPreset]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id, refreshList]);

  useEffect(() => {
    if (!open || !user) return;
    setPresetGroupNames(readGroupNamesFromLs());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  const sortedFolderKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const f of items) keys.add(folderKey(f));
    return Array.from(keys).sort((a, b) => {
      if (a === "" && b !== "") return 1;
      if (a !== "" && b === "") return -1;
      return a.localeCompare(b, "tr", { sensitivity: "base" });
    });
  }, [items]);

  const itemsByFolder = useMemo(() => {
    const m = new Map<string, SavedFilter[]>();
    for (const f of items) {
      const k = folderKey(f);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(f);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return m;
  }, [items]);

  const folderSuggestions = useMemo(
    () => sortedFolderKeys.filter((k) => k.length > 0),
    [sortedFolderKeys],
  );

  /** Kayıt + satır seçiciler: önceden tanımlı grup adları ∪ sunucuda kullanılan klasörler */
  const mergedGroupOptions = useMemo(() => {
    const s = new Set<string>();
    for (const g of presetGroupNames) {
      const n = normalizeFolderInput(g);
      if (n) s.add(n);
    }
    for (const k of folderSuggestions) s.add(k);
    return Array.from(s).sort((a, b) => a.localeCompare(b, "tr", { sensitivity: "base" }));
  }, [presetGroupNames, folderSuggestions]);

  const addPresetGroup = useCallback(() => {
    const n = normalizeFolderInput(newGroupInput);
    if (!n) return;
    setPresetGroupNames((prev) => {
      const s = new Set(prev);
      s.add(n);
      const next = Array.from(s).sort((a, b) => a.localeCompare(b, "tr", { sensitivity: "base" }));
      writeGroupNamesToLs(next);
      return next;
    });
    setNewGroupInput("");
  }, [newGroupInput]);

  const removePresetGroupName = useCallback((name: string) => {
    const n = normalizeFolderInput(name);
    if (!n) return;
    setRenamingPreset(null);
    setRenamingPresetValue("");
    setPresetGroupNames((prev) => {
      const next = prev.filter((x) => normalizeFolderInput(x) !== n);
      writeGroupNamesToLs(next);
      return next;
    });
    if (saveFolderSelect === n) setSaveFolderSelect("");
  }, [saveFolderSelect]);

  const commitPresetGroupRename = useCallback(async () => {
    const oldO = renamingPreset;
    const newN = normalizeFolderInput(renamingPresetValue);
    if (!oldO) return;
    if (!newN) {
      setErr("Grup adı boş olamaz.");
      return;
    }
    if (oldO === newN) {
      setRenamingPreset(null);
      setRenamingPresetValue("");
      return;
    }
    setRenamingPresetBusy(true);
    setErr(null);
    const targets = items.filter((f) => folderKey(f) === oldO);
    try {
      for (const f of targets) {
        const resp = await fetch(`/api/filters?id=${encodeURIComponent(f.id)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ folder: newN }),
        });
        const data = (await resp.json()) as { ok?: boolean; error?: string };
        if (!data.ok) throw new Error(data.error || "Grup güncellenemedi");
      }
      setPresetGroupNames((prev) => {
        const next = new Set<string>();
        for (const x of prev) {
          const xn = normalizeFolderInput(x);
          if (!xn) continue;
          if (xn === oldO) next.add(newN);
          else next.add(xn);
        }
        const arr = Array.from(next).sort((a, b) => a.localeCompare(b, "tr", { sensitivity: "base" }));
        writeGroupNamesToLs(arr);
        return arr;
      });
      if (normalizeFolderInput(saveFolderSelect) === oldO) setSaveFolderSelect(newN);
      setRenamingPreset(null);
      setRenamingPresetValue("");
      await refreshList();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Grup adı değiştirilemedi");
    } finally {
      setRenamingPresetBusy(false);
    }
  }, [renamingPreset, renamingPresetValue, items, refreshList, saveFolderSelect]);

  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set());

  const toggleFolderCollapsed = useCallback((key: string) => {
    setCollapsedFolders((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }, []);

  const patchFolder = useCallback(
    async (id: string, folder: string) => {
      setErr(null);
      const folderNorm = normalizeFolderInput(folder);
      try {
        const resp = await fetch(`/api/filters?id=${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ folder: folderNorm }),
        });
        const data = await resp.json();
        if (!data.ok) setErr(data.error || "Grup güncellenemedi");
        else await refreshList();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Ağ hatası");
      }
    },
    [refreshList],
  );

  const saveCurrent = useCallback(async () => {
    const name = saveName.trim();
    if (!name) return;
    setSaving(true);
    setErr(null);
    try {
      const payload = captureSnapshot();
      const folder = normalizeFolderInput(saveFolderSelect);
      const resp = await fetch("/api/filters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, payload, folder }),
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
  }, [saveName, saveFolderSelect, captureSnapshot, refreshList]);

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
              {/* Önce tanımlı gruplar (tarayıcıda saklanır) */}
              <section className="rounded border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold text-gray-800 mb-1">Gruplarım</div>
                <p className="text-[10px] text-gray-500 mb-2 leading-snug">
                  Grup ekleyin; aşağıda filtre kaydederken veya mevcut filtre satırından bu listeyi seçerek atayın. Chip üzerindeki ✎ ile adı değiştirebilirsin — aynı gruptaki tüm filtreler sunucuda yeni adla güncellenir. Grup seçmeyen kayıtlar{" "}
                  <span className="font-medium">Grupsuz</span> altında kalır.
                </p>
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <input
                    value={newGroupInput}
                    onChange={(e) => setNewGroupInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addPresetGroup();
                    }}
                    placeholder="Yeni grup adı (örn. Haftalık)"
                    className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                    maxLength={FOLDER_MAX}
                  />
                  <button
                    type="button"
                    onClick={() => addPresetGroup()}
                    disabled={!normalizeFolderInput(newGroupInput) || renamingPresetBusy}
                    className="shrink-0 rounded border border-emerald-600 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-40">
                    Grup ekle
                  </button>
                </div>
                {presetGroupNames.length === 0 ? (
                  <div className="text-[10px] text-gray-400 italic">Henüz tanımlı grup yok — yukarıdan ekleyin.</div>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {presetGroupNames.map((g) => {
                      const gNorm = normalizeFolderInput(g);
                      const editing = renamingPreset !== null && renamingPreset === gNorm;
                      if (editing) {
                        return (
                          <li
                            key={gNorm}
                            className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-[10px] text-slate-800">
                            <input
                              value={renamingPresetValue}
                              onChange={(e) => setRenamingPresetValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void commitPresetGroupRename();
                                if (e.key === "Escape") {
                                  setRenamingPreset(null);
                                  setRenamingPresetValue("");
                                }
                              }}
                              className="min-w-0 max-w-[12rem] rounded border border-gray-300 px-1.5 py-0.5 text-[10px]"
                              maxLength={FOLDER_MAX}
                              disabled={renamingPresetBusy}
                              autoFocus
                              aria-label="Yeni grup adı"
                            />
                            <button
                              type="button"
                              disabled={renamingPresetBusy}
                              onClick={() => void commitPresetGroupRename()}
                              className="shrink-0 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40">
                              Kaydet
                            </button>
                            <button
                              type="button"
                              disabled={renamingPresetBusy}
                              onClick={() => {
                                setRenamingPreset(null);
                                setRenamingPresetValue("");
                              }}
                              className="shrink-0 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[9px] text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                              İptal
                            </button>
                          </li>
                        );
                      }
                      return (
                        <li
                          key={gNorm}
                          className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-800">
                          <span className="truncate" title={g}>
                            {g}
                          </span>
                          <button
                            type="button"
                            disabled={renamingPresetBusy}
                            className="shrink-0 px-0.5 text-slate-500 hover:text-emerald-700 disabled:opacity-40"
                            title="Grup adını değiştir (aynı isimdeki tüm filtreler güncellenir)"
                            onClick={() => {
                              setRenamingPreset(gNorm);
                              setRenamingPresetValue(g);
                            }}
                            aria-label={`${g} grubunu yeniden adlandır`}>
                            ✎
                          </button>
                          <button
                            type="button"
                            disabled={renamingPresetBusy}
                            className="shrink-0 text-slate-500 hover:text-red-600 disabled:opacity-40"
                            title="Listeden kaldır (filtrelerdeki klasör adı değişmez; istersen satırdan Grupsuz yap)"
                            onClick={() => removePresetGroupName(g)}
                            aria-label={`${g} grubunu listeden kaldır`}>
                            ×
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Yeni kaydet */}
              <section className="bg-gray-50 border border-gray-200 rounded p-3">
                <div className="text-xs font-semibold text-gray-800 mb-2">Şu anki filtreyi kaydet</div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <input
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveCurrent();
                      }}
                      placeholder="İsim ver (örn. akşam-ligler-mskod-son2)"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                      maxLength={80}
                    />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <label htmlFor="save-filter-folder-select" className="text-[10px] font-medium text-gray-600">
                        Grup
                      </label>
                      <select
                        id="save-filter-folder-select"
                        value={saveFolderSelect}
                        onChange={(e) => setSaveFolderSelect(e.target.value)}
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs">
                        <option value="">Grupsuz</option>
                        {mergedGroupOptions.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveCurrent()}
                    disabled={saving || !saveName.trim()}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded font-medium whitespace-nowrap">
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
                  <div className="divide-y divide-gray-100">
                    {sortedFolderKeys.map((fk) => {
                      const list = itemsByFolder.get(fk) ?? [];
                      const label = fk ? fk : "Grupsuz";
                      const collapsed = collapsedFolders.has(fk);
                      return (
                        <div key={fk || "__none__"}>
                          <button
                            type="button"
                            onClick={() => toggleFolderCollapsed(fk)}
                            className="flex w-full items-center gap-2 bg-slate-50/90 px-2 py-1.5 text-left text-[11px] font-semibold text-slate-800 hover:bg-slate-100">
                            <span className="w-4 shrink-0 text-slate-500">{collapsed ? "▸" : "▾"}</span>
                            <span className="min-w-0 flex-1 truncate">{label}</span>
                            <span className="shrink-0 text-[10px] font-normal text-slate-500">({list.length})</span>
                          </button>
                          {!collapsed && (
                            <ul>
                              {list.map((f) => (
                                <li key={f.id} className="border-t border-gray-100 p-2 hover:bg-gray-50 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-2">
                                  <div className="flex-1 min-w-0">
                                    {renamingId === f.id ? (
                                      <div className="flex gap-1">
                                        <input
                                          value={renameValue}
                                          onChange={(e) => setRenameValue(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") void rename(f.id);
                                            else if (e.key === "Escape") {
                                              setRenamingId(null);
                                              setRenameValue("");
                                            }
                                          }}
                                          autoFocus
                                          className="flex-1 border border-gray-300 rounded px-2 py-0.5 text-xs"
                                          maxLength={80}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => void rename(f.id)}
                                          className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2">
                                          OK
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => apply(f)}
                                          className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 truncate block text-left">
                                          {f.name}
                                        </button>
                                        <div className="text-[10px] text-gray-500">
                                          son güncelleme: {new Date(f.updated_at).toLocaleString("tr-TR")}
                                        </div>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                          <span className="text-[9px] text-gray-500">Grup:</span>
                                          <select
                                            value={folderKey(f)}
                                            onChange={(e) => {
                                              void patchFolder(f.id, e.target.value);
                                            }}
                                            className="max-w-[min(16rem,70vw)] rounded border border-gray-300 bg-white px-1 py-0.5 text-[9px] text-gray-800"
                                            title="Filtreyi gruba ata (önce Gruplarım’dan grup ekleyin)">
                                            <option value="">Grupsuz</option>
                                            {mergedGroupOptions.map((k) => (
                                              <option key={k} value={k}>
                                                {k}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                        <SavedFilterSummary payload={f.payload} />
                                      </>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1 shrink-0 sm:flex-col sm:items-end">
                                    <button
                                      type="button"
                                      onClick={() => apply(f)}
                                      className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-1"
                                      title="Bu filtreyi uygula">
                                      Yükle
                                    </button>
                                    <button
                                      type="button"
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
                                      type="button"
                                      onClick={() => {
                                        setRenamingId(f.id);
                                        setRenameValue(f.name);
                                      }}
                                      className="text-[10px] bg-gray-200 hover:bg-gray-300 text-gray-800 rounded px-2 py-1"
                                      title="Yeniden adlandır">
                                      ✎
                                    </button>
                                    <button
                                      type="button"
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
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
