"use client";

/**
 * AuthBar — header'a yerleşen kompakt oturum widget'ı.
 *
 * Davranış:
 *   • Oturum yok → "Giriş" butonu → popover'da email+şifre ile giriş / kayıt ol
 *   • Oturum var → avatar (baş harf) + email truncate + "Çıkış" butonu
 *
 * Popover `createPortal(document.body)` + yüksek z-index: tablo sticky başlık
 * ve yükleme örtüsünün (z-75) üstünde kalır.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { ADMIN_EMAIL } from "@/lib/auth/access";

type Status = "idle" | "sending" | "sent" | "error";

/** Supabase Auth hatalarını kullanıcıya anlaşılır + yapılabilir şekilde göster. */
function formatAuthErrorForUser(raw: string): string {
  const m = raw.trim().toLowerCase();
  if (
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("over_email") ||
    m.includes("over_request") ||
    m === "429" ||
    raw.includes("429")
  ) {
    return [
      "E-posta veya OTP isteği Supabase tarafında sınırlandı (çok sık deneme veya proje kotası).",
      "Ne yapabilirsiniz: bir süre bekleyin; geliştirmede aynı hesap için alttan «Şifre ile gir» kullanın (ek posta göndermez).",
      "Kotayı yükseltmek: Supabase Dashboard → projeniz → Authentication → Rate Limits (OTP / e-posta gönderim limitleri).",
      "Yerleşik e-posta ile saatlik gönderim düşük olabilir; özel SMTP tanımlayınca e-posta tarafı genelde esnetilir.",
      "Ayrıntı: https://supabase.com/docs/guides/auth/rate-limits",
    ].join(" ");
  }
  return raw.trim() || "Bilinmeyen hata.";
}

export function AuthBar() {
  const [user, setUser] = useState<User | null>(null);
  const [approved, setApproved] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPopoverPos(null);
      return;
    }
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPopoverPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, user]);

  /** İlk mount'ta ve auth değişiminde user'ı senkronize et. */
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        const r = await fetch("/api/auth/access-status");
        const j = await r.json();
        if (!cancelled && r.ok && j.ok) {
          setApproved(Boolean(j.approved));
          setIsAdmin(Boolean(j.isAdmin));
        }
      } else {
        setApproved(false);
        setIsAdmin(false);
      }
      setReady(true);
    };
    void sync();
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
      },
    );
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  /** URL'de auth_error parametresi varsa bir kez göster ve temizle. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const err = url.searchParams.get("auth_error");
    if (err) {
      setMsg(`Giriş başarısız: ${err}`);
      setStatus("error");
      setOpen(true);
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const login = useCallback(async () => {
    const e = email.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setStatus("error");
      setMsg("Geçerli bir e-posta adresi girin.");
      return;
    }
    if (password.length < 8) {
      setStatus("error");
      setMsg("Şifre en az 8 karakter olmalı.");
      return;
    }
    setStatus("sending");
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email: e, password });
    if (error) {
      setStatus("error");
      const code = "code" in error && typeof (error as { code?: string }).code === "string"
        ? (error as { code: string }).code
        : "";
      setMsg(formatAuthErrorForUser([error.message, code].filter(Boolean).join(" ")));
    } else {
      const accessRes = await fetch("/api/auth/access-status");
      const accessJson = await accessRes.json();
      if (!accessRes.ok || !accessJson.ok) {
        setStatus("error");
        setMsg(accessJson.error ?? "Hesap onayı doğrulanamadı.");
        return;
      }
      const okApproved = Boolean(accessJson.approved);
      const okAdmin = Boolean(accessJson.isAdmin);
      if (!okApproved && !okAdmin) {
        await supabase.auth.signOut();
        setStatus("error");
        setMsg("Hesabın kayıtlı; admin onayı bekleniyor. Onay sonrası giriş yapabilirsin.");
        return;
      }
      setApproved(okApproved);
      setIsAdmin(okAdmin);
      setOpen(false);
      setStatus("idle");
      setMsg(null);
    }
  }, [email, password]);

  const register = useCallback(async () => {
    const e = email.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setStatus("error");
      setMsg("Geçerli bir e-posta adresi girin.");
      return;
    }
    if (password.length < 8) {
      setStatus("error");
      setMsg("Şifre en az 8 karakter olmalı.");
      return;
    }
    setStatus("sending");
    setMsg(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: e, password }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setStatus("error");
      setMsg(json.error ?? "Kayıt başarısız");
    } else {
      setStatus("sent");
      setMsg(json.message ?? "Kayıt alındı. Admin onayı bekleniyor.");
    }
  }, [email, password]);

  const requestReset = useCallback(async () => {
    const e = email.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setStatus("error");
      setMsg("Şifre sıfırlama için geçerli e-posta girin.");
      return;
    }
    setStatus("sending");
    setMsg(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: e }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setStatus("error");
      setMsg(json.error ?? "Şifre sıfırlama başlatılamadı.");
      return;
    }
    setStatus("sent");
    setMsg(json.message ?? "Sıfırlama bağlantısı gönderildi.");
  }, [email]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setApproved(false);
    setIsAdmin(false);
    setOpen(false);
  }, []);

  const portal =
    open &&
    popoverPos &&
    typeof document !== "undefined" &&
    createPortal(
      <>
        <div
          className="fixed inset-0 z-[200] bg-black/25"
          aria-hidden
          onClick={() => setOpen(false)}
        />
        <div
          className="fixed z-[210] w-[min(22rem,calc(100vw-1rem))] rounded border border-gray-300 bg-white p-3 shadow-2xl"
          style={{ top: popoverPos.top, right: popoverPos.right }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="authbar-popover-title">
          {user ? (
            <>
              <div id="authbar-popover-title" className="text-[10px] text-gray-500 mb-1">
                Giriş yapılı:
              </div>
              <div className="text-xs font-medium text-gray-900 truncate mb-2">{user.email ?? "(e-posta yok)"}</div>
              {isAdmin && (
                <a
                  href="/admin"
                  className="mb-2 inline-flex w-full items-center justify-center rounded border border-indigo-300 bg-indigo-50 px-2 py-1.5 text-xs text-indigo-800 hover:bg-indigo-100">
                  Admin paneli
                </a>
              )}
              <button
                type="button"
                onClick={signOut}
                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1.5 rounded">
                Çıkış yap
              </button>
            </>
          ) : (
            <>
              <div id="authbar-popover-title" className="text-xs font-semibold text-gray-800 mb-1">
                {mode === "login" ? "Giriş yap" : "Kayıt ol"}
              </div>
              <div className="text-[10px] text-gray-500 mb-2 leading-snug">
                {mode === "login"
                  ? "E-posta ve şifre ile giriş yap. Hesap onaylı değilse girişe izin verilmez."
                  : `Kayıt sonrası admin (${ADMIN_EMAIL}) onayı beklenir.`}
              </div>
              <div className="mb-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`flex-1 rounded border px-2 py-1 text-[11px] ${mode === "login" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300"}`}>
                  Giriş yap
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={`flex-1 rounded border px-2 py-1 text-[11px] ${mode === "register" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300"}`}>
                  Kayıt ol
                </button>
              </div>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void (mode === "login" ? login() : register()); }}
                placeholder="ornek@eposta.com"
                className="w-full border border-gray-300 rounded bg-white px-2 py-1 text-xs text-gray-900 placeholder:text-gray-400 mb-2"
                disabled={status === "sending"}
              />
              <input
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void (mode === "login" ? login() : register()); }}
                placeholder="Şifre (en az 8 karakter)"
                className="w-full border border-gray-300 rounded bg-white px-2 py-1 text-xs text-gray-900 placeholder:text-gray-400 mb-2"
                disabled={status === "sending"}
              />
              <button
                type="button"
                onClick={() => void (mode === "login" ? login() : register())}
                disabled={status === "sending"}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs px-2 py-1.5 rounded">
                {status === "sending" ? "İşleniyor…" : mode === "login" ? "Giriş yap" : "Kayıt ol"}
              </button>
              <button
                type="button"
                onClick={() => void requestReset()}
                className="mt-2 w-full text-[11px] text-indigo-700 hover:text-indigo-900 underline">
                Şifremi sıfırla
              </button>
              {msg && (
                <div
                  className={`mt-2 text-[10px] rounded px-2 py-1 text-left leading-snug ${
                    status === "error"
                      ? "bg-red-50 text-red-700 border border-red-200 max-h-44 overflow-y-auto"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}>
                  {msg}
                </div>
              )}
            </>
          )}
        </div>
      </>,
      document.body,
    );

  if (!ready) {
    return <div className="text-[10px] text-gray-500 px-2">…</div>;
  }

  if (user) {
    const letter = (user.email ?? "?").slice(0, 1).toUpperCase();
    const emailText = user.email ?? "(e-posta yok)";
    return (
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded px-2 py-1 text-xs"
          title={`Giriş: ${emailText}`}>
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
            {letter}
          </span>
          <span className="hidden sm:inline text-gray-700 truncate max-w-[120px]">{emailText}</span>
          {!approved && !isAdmin && (
            <span className="hidden sm:inline rounded bg-amber-100 text-amber-800 px-1 py-[1px] text-[9px]">
              beklemede
            </span>
          )}
        </button>
        {portal}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setStatus("idle");
          setMsg(null);
          setPassword("");
          setMode("login");
        }}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded font-medium">
        Giriş
      </button>
      {portal}
    </div>
  );
}
