"use client";

/**
 * AuthBar — header'a yerleşen kompakt oturum widget'ı.
 *
 * Davranış:
 *   • Oturum yok → "Giriş" butonu → popover'da email input + "Sihirli bağlantı gönder"
 *   • Oturum var → avatar (baş harf) + email truncate + "Çıkış" butonu
 *
 * Magic link redirect: tarayıcı localhost/127.0.0.1 ise maildeki link her zaman
 * o anki origin'e döner (prod URL'ye gitmez). Diğer ortamlarda `NEXT_PUBLIC_SITE_URL`
 * veya `window.location.origin` kullanılır.
 * Supabase Dashboard → Auth → URL: Redirect URLs'e `http://localhost:3000/auth/callback`
 * (portunuza göre) + prod `/auth/callback` ekleyin.
 *
 * Geliştirme: `LOCAL_DEV_PASSWORD_EMAIL` için şifre alanı — Supabase Dashboard'da
 * bu kullanıcıya Email+Password şifresi tanımlanmalı (sihirli bağlantıya gerek yok).
 *
 * Popover `createPortal(document.body)` + yüksek z-index: tablo sticky başlık
 * ve yükleme örtüsünün (z-75) üstünde kalır.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

/** Yerelde şifre ile giriş (sadece `next dev`); Supabase'te bu e-postaya şifre verin. */
const LOCAL_DEV_PASSWORD_EMAIL = "ahmetserhatelmas@gmail.com";

/** Maildeki redirect: önce production origin; yanlış localhost build'ini canlı sitede yok say. */
function canonicalSiteOrigin(): string {
  const envRaw = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SITE_URL?.trim() : "";
  let envOrigin = "";
  if (envRaw) {
    try {
      envOrigin = new URL(envRaw).origin;
    } catch {
      envOrigin = envRaw.replace(/\/$/, "");
    }
  }
  const win = typeof window !== "undefined" ? window.location.origin : "";
  const isLocal = (o: string) => /localhost|127\.0\.0\.1/i.test(o);
  if (envOrigin && !isLocal(envOrigin)) return envOrigin;
  if (win && !isLocal(win)) return win;
  if (envOrigin) return envOrigin;
  return win;
}

/** OTP mailindeki `emailRedirectTo`: localhost'ta asla prod origin kullanma. */
function magicLinkRedirectOrigin(): string {
  if (typeof window !== "undefined") {
    const o = window.location.origin;
    if (/localhost|127\.0\.0\.1/i.test(o)) return o;
  }
  return canonicalSiteOrigin();
}

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
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [devPassword, setDevPassword] = useState("");
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
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });
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

  const sendLink = useCallback(async () => {
    const e = email.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setStatus("error");
      setMsg("Geçerli bir e-posta adresi girin.");
      return;
    }
    setStatus("sending");
    setMsg(null);
    const origin = magicLinkRedirectOrigin();
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      const code = "code" in error && typeof (error as { code?: string }).code === "string"
        ? (error as { code: string }).code
        : "";
      setMsg(formatAuthErrorForUser([error.message, code].filter(Boolean).join(" ")));
    } else {
      setStatus("sent");
      setMsg("Bağlantıyı postana gönderdik. Maildeki linke tıkla.");
    }
  }, [email]);

  const signInWithPasswordLocal = useCallback(async () => {
    if (process.env.NODE_ENV !== "development") return;
    const e = email.trim().toLowerCase();
    if (e !== LOCAL_DEV_PASSWORD_EMAIL) return;
    const p = devPassword;
    if (!p) {
      setStatus("error");
      setMsg("Şifre girin.");
      return;
    }
    setStatus("sending");
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
    if (error) {
      setStatus("error");
      const code = "code" in error && typeof (error as { code?: string }).code === "string"
        ? (error as { code: string }).code
        : "";
      setMsg(formatAuthErrorForUser([error.message, code].filter(Boolean).join(" ")));
    } else {
      setOpen(false);
      setDevPassword("");
      setStatus("idle");
      setMsg(null);
    }
  }, [email, devPassword]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
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
                E-posta ile giriş
              </div>
              <div className="text-[10px] text-gray-500 mb-2 leading-snug">
                Postana sihirli bir bağlantı yollayacağız. Tıklayınca giriş yapmış olursun — şifre yok.
              </div>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void sendLink(); }}
                placeholder="ornek@eposta.com"
                className="w-full border border-gray-300 rounded bg-white px-2 py-1 text-xs text-gray-900 placeholder:text-gray-400 mb-2"
                disabled={status === "sending" || status === "sent"}
              />
              <button
                type="button"
                onClick={() => void sendLink()}
                disabled={status === "sending" || status === "sent"}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs px-2 py-1.5 rounded">
                {status === "sending" ? "Gönderiliyor…" : status === "sent" ? "Gönderildi" : "Bağlantı gönder"}
              </button>
              {process.env.NODE_ENV === "development" &&
                email.trim().toLowerCase() === LOCAL_DEV_PASSWORD_EMAIL && (
                  <div className="mt-2 pt-2 border-t border-amber-200 space-y-1.5">
                    <div className="text-[10px] text-amber-900 leading-snug">
                      Yerel: bu hesap için şifre ile gir (Supabase’te kullanıcıya şifre tanımlı olmalı).
                    </div>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={devPassword}
                      onChange={(ev) => setDevPassword(ev.target.value)}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") void signInWithPasswordLocal();
                      }}
                      placeholder="Şifre"
                      disabled={status === "sending"}
                      className="w-full border border-gray-300 rounded bg-white px-2 py-1 text-xs text-gray-900 placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => void signInWithPasswordLocal()}
                      disabled={status === "sending"}
                      className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs px-2 py-1.5 rounded">
                      {status === "sending" ? "Giriş…" : "Şifre ile gir"}
                    </button>
                  </div>
                )}
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
          setDevPassword("");
        }}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded font-medium">
        Giriş
      </button>
      {portal}
    </div>
  );
}
