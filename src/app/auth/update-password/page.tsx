"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setMsg(null);
    if (password.length < 8) {
      setErr("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (password !== password2) {
      setErr("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Şifre güncellendi. Ana sayfaya yönlendiriliyorsun…");
    setTimeout(() => router.push("/"), 1200);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-4 space-y-3">
        <h1 className="text-sm font-semibold text-slate-800">Şifre Güncelle</h1>
        <p className="text-xs text-slate-500">
          E-postadaki sıfırlama bağlantısından geldiysen yeni şifreni belirleyebilirsin.
        </p>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Yeni şifre"
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
          disabled={loading}
        />
        <input
          type="password"
          autoComplete="new-password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          placeholder="Yeni şifre (tekrar)"
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading}
          className="w-full rounded bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700 disabled:opacity-60">
          {loading ? "Güncelleniyor…" : "Şifreyi güncelle"}
        </button>
        {err && <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">{err}</div>}
        {msg && <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">{msg}</div>}
      </div>
    </div>
  );
}
