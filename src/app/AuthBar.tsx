"use client";

/**
 * AuthBar — oturum widget'ı.
 *
 * `variant="header"` (varsayılan):
 *   • Oturum yok → "Giriş" → popover: e-posta + şifre + şifremi sıfırla
 *   • Oturum var → avatar + çıkış
 *
 * `variant="gate"`: Ana sayfa giriş duvarı — tam ekran kart (kayıt yok).
 *
 * Popover `createPortal(document.body)` + yüksek z-index: tablo sticky başlık
 * ve yükleme örtüsünün (z-75) üstünde kalır.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { recordSessionRevAfterLogin, storageKeySessionRev } from "@/app/SessionRevGuard";

type Status = "idle" | "sending" | "sent" | "error";

/** Supabase Auth hatalarını kullanıcıya anlaşılır + yapılabilir şekilde göster. */
function formatAuthErrorForUser(raw: string): string {
  const m = raw.trim().toLowerCase();
  const looksRateLimited =
    m.includes("rate limit") ||
    m.includes("rate_limit") ||
    m.includes("email rate limit") ||
    m.includes("too many requests") ||
    m.includes("over_email") ||
    m.includes("over_request") ||
    m === "429" ||
    raw.includes("429");
  if (looksRateLimited) {
    return [
      "Çok sık deneme: Supabase giriş / e-posta gönderim limiti aşıldı. Bir süre bekleyip tekrar dene.",
      "Sıfırlama maili istemeden sadece şifre ile giriş yap (ek posta göndermez).",
      "Limit: Supabase Dashboard → Authentication → Rate Limits; kalıcı çözüm için özel SMTP.",
      "https://supabase.com/docs/guides/auth/rate-limits",
    ].join(" ");
  }
  return raw.trim() || "Bilinmeyen hata.";
}

export type AuthBarVariant = "header" | "gate";

export function AuthBar({
  variant = "header",
  /** Ana sayfa kapısı: üst bileşen oturumu zaten çözdüyse ikinci “Yükleniyor” gösterme */
  gateHydrated = false,
}: {
  variant?: AuthBarVariant;
  gateHydrated?: boolean;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [approved, setApproved] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPopoverPos(null);
      return;
    }
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const pad = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Tailwind: w-[min(22rem,calc(100vw-1rem))] — pratikte 352px cap + yatay padding
      const width = Math.max(240, Math.min(22 * 16, vw - pad * 2));
      // Sağa hizalı his: popover'ın sağ kenarı tetikleyicinin sağıyla hizalansın,
      // ama asla viewport dışına taşmasın (özellikle dar mobilde).
      const idealRight = r.right;
      const left = Math.min(Math.max(pad, idealRight - width), vw - pad - width);
      // Çok kısa ekranlarda aşağı taşmayı azalt (klavye açıkken de işe yarar)
      const maxTop = Math.max(pad, vh - pad - 240);
      const top = Math.min(r.bottom + 6, maxTop);
      setPopoverPos({ top, left, width });
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
      const sess = (await supabase.auth.getSession()).data.session;
      const uid = sess?.user?.id;
      if (uid) {
        const bump = await fetch("/api/auth/session-rev", { method: "POST", credentials: "same-origin" });
        if (bump.ok) {
          const bj = (await bump.json()) as { ok?: boolean; rev?: number };
          if (bj.ok && typeof bj.rev === "number") recordSessionRevAfterLogin(uid, bj.rev);
        }
      }
    }
  }, [email, password]);

  /** Onaylı hesaplara e-posta ile sıfırlama linki; tıklayınca `/auth/callback` → `/auth/update-password`. */
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
    setMsg(json.message ?? "Sıfırlama bağlantısı gönderildi. E-postanı kontrol et.");
  }, [email]);

  const loginFormInner = (
    <>
      <div className="text-[10px] text-gray-500 mb-2 leading-snug">
        E-posta ve şifre ile giriş yap. Hesap onaylı değilse girişe izin verilmez.
      </div>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void login();
        }}
        placeholder="ornek@eposta.com"
        className="mb-2 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 caret-gray-900 shadow-sm placeholder:text-slate-500 [color-scheme:light]"
        style={{ WebkitTextFillColor: "#111827" }}
        disabled={status === "sending"}
      />
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void login();
        }}
        placeholder="Şifre (en az 8 karakter)"
        className="mb-2 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 caret-gray-900 shadow-sm placeholder:text-slate-500 [color-scheme:light]"
        style={{ WebkitTextFillColor: "#111827" }}
        disabled={status === "sending"}
      />
      <button
        type="button"
        onClick={() => void login()}
        disabled={status === "sending"}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs px-2 py-1.5 rounded">
        {status === "sending" ? "İşleniyor…" : "Giriş yap"}
      </button>
      <button
        type="button"
        onClick={() => void requestReset()}
        disabled={status === "sending"}
        className="mt-2 w-full text-[11px] text-indigo-700 hover:text-indigo-900 underline disabled:opacity-50">
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
  );

  const signOut = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;
    if (uid) sessionStorage.removeItem(storageKeySessionRev(uid));
    await supabase.auth.signOut();
    setApproved(false);
    setIsAdmin(false);
    setOpen(false);
  }, []);

  if (variant === "gate") {
    if (!ready && !gateHydrated) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600">
          Yükleniyor…
        </div>
      );
    }
    if (user) return null;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 px-4 py-10">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">Oranexcel</h1>
          <p className="mt-1 text-xs text-slate-600">İddaa veri ve filtreleme — devam etmek için giriş yapın</p>
        </div>
        <div
          className="w-full max-w-sm rounded-xl border border-slate-300 bg-white p-5 text-gray-900 shadow-xl [color-scheme:light]"
          role="dialog"
          aria-labelledby="auth-gate-title">
          <h2 id="auth-gate-title" className="mb-3 text-sm font-semibold text-slate-800">
            Giriş yap
          </h2>
          {loginFormInner}
        </div>
      </div>
    );
  }

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
          className="fixed z-[210] max-w-[calc(100vw-1rem)] rounded border border-gray-300 bg-white p-3 text-gray-900 shadow-2xl [color-scheme:light]"
          style={{ top: popoverPos.top, left: popoverPos.left, width: popoverPos.width }}
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
                Giriş yap
              </div>
              {loginFormInner}
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
        }}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded font-medium">
        Giriş
      </button>
      {portal}
    </div>
  );
}
