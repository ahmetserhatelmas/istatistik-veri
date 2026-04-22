"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ADMIN_EMAIL } from "@/lib/auth/access";

type AccessUser = {
  user_id: string;
  email: string;
  is_approved: boolean;
  approved_at: string | null;
  approved_by_email: string | null;
  created_at: string;
  updated_at: string;
};

function fmtDate(v: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString("tr-TR");
}

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [users, setUsers] = useState<AccessUser[]>([]);

  const pending = useMemo(() => users.filter((u) => !u.is_approved), [users]);
  const approved = useMemo(() => users.filter((u) => u.is_approved), [users]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/users");
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Kullanıcılar okunamadı");
      setUsers((j.users ?? []) as AccessUser[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ağ hatası");
    } finally {
      setLoading(false);
    }
  }, []);

  const approve = useCallback(async (userId: string, nextApproved: boolean) => {
    setErr(null);
    const res = await fetch("/api/admin/users/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, approved: nextApproved }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) {
      setErr(j.error ?? "Güncelleme başarısız");
      return;
    }
    await loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email?.toLowerCase() ?? "";
      const ok = email === ADMIN_EMAIL;
      if (cancelled) return;
      setAuthorized(ok);
      setReady(true);
      if (ok) await loadUsers();
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [loadUsers]);

  if (!ready) {
    return <div className="p-6 text-sm text-gray-500">Yükleniyor…</div>;
  }

  if (!authorized) {
    return (
      <div className="p-6">
        <div className="max-w-xl rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Bu sayfa sadece admin hesabına açık.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Admin Paneli</h1>
        <a href="/" className="text-xs text-blue-700 hover:underline">
          Ana sayfaya dön
        </a>
      </div>

      {err && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {err}
        </div>
      )}

      <section className="rounded border border-slate-200 bg-white p-3">
        <div className="mb-2 text-sm font-semibold text-slate-800">
          Onay Bekleyen Hesaplar ({pending.length})
        </div>
        {loading ? (
          <div className="text-xs text-slate-500">Yükleniyor…</div>
        ) : pending.length === 0 ? (
          <div className="text-xs text-emerald-700">Bekleyen hesap yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="text-left py-1">E-posta</th>
                  <th className="text-left py-1">Kayıt</th>
                  <th className="text-right py-1">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((u) => (
                  <tr key={u.user_id} className="border-b border-slate-100">
                    <td className="py-1 font-mono">{u.email}</td>
                    <td className="py-1">{fmtDate(u.created_at)}</td>
                    <td className="py-1 text-right">
                      <button
                        type="button"
                        onClick={() => void approve(u.user_id, true)}
                        className="rounded bg-emerald-600 px-2 py-1 text-[11px] text-white hover:bg-emerald-700">
                        Onayla
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded border border-slate-200 bg-white p-3">
        <div className="mb-2 text-sm font-semibold text-slate-800">
          Onaylı Hesaplar ({approved.length})
        </div>
        {approved.length === 0 ? (
          <div className="text-xs text-slate-500">Henüz onaylı hesap yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="text-left py-1">E-posta</th>
                  <th className="text-left py-1">Onay zamanı</th>
                  <th className="text-left py-1">Onaylayan</th>
                  <th className="text-right py-1">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((u) => (
                  <tr key={u.user_id} className="border-b border-slate-100">
                    <td className="py-1 font-mono">{u.email}</td>
                    <td className="py-1">{fmtDate(u.approved_at)}</td>
                    <td className="py-1 font-mono">{u.approved_by_email ?? "—"}</td>
                    <td className="py-1 text-right">
                      {u.email !== ADMIN_EMAIL && (
                        <button
                          type="button"
                          onClick={() => void approve(u.user_id, false)}
                          className="rounded bg-amber-600 px-2 py-1 text-[11px] text-white hover:bg-amber-700">
                          Onayı kaldır
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
