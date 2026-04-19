"use client";

/**
 * AuthBar — header'a yerleşen kompakt oturum widget'ı.
 *
 * Davranış:
 *   • Oturum yok → "Giriş" butonu → popover'da email input + "Sihirli bağlantı gönder"
 *   • Oturum var → avatar (baş harf) + email truncate + "Çıkış" butonu
 *
 * Magic link: `NEXT_PUBLIC_SITE_URL` (Vercel'de production URL) varsa maildeki
 * yönlendirme her zaman bu domaine gider; yoksa `window.location.origin`.
 * Supabase Dashboard → Auth → URL: Site URL ve Redirect URLs'e aynı domain
 * + `/auth/callback` ekleyin.
 *
 * Popover `createPortal(document.body)` + yüksek z-index: tablo sticky başlık
 * ve yükleme örtüsünün (z-75) üstünde kalır.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

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

export function AuthBar() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
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
    const origin = canonicalSiteOrigin();
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setMsg(error.message);
    } else {
      setStatus("sent");
      setMsg("Bağlantıyı postana gönderdik. Maildeki linke tıkla.");
    }
  }, [email]);

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
          className="fixed z-[210] w-72 rounded border border-gray-300 bg-white p-3 shadow-2xl"
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
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs mb-2"
                disabled={status === "sending" || status === "sent"}
              />
              <button
                type="button"
                onClick={() => void sendLink()}
                disabled={status === "sending" || status === "sent"}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs px-2 py-1.5 rounded">
                {status === "sending" ? "Gönderiliyor…" : status === "sent" ? "Gönderildi" : "Bağlantı gönder"}
              </button>
              {msg && (
                <div
                  className={`mt-2 text-[10px] rounded px-2 py-1 ${
                    status === "error"
                      ? "bg-red-50 text-red-700 border border-red-200"
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
        onClick={() => { setOpen((v) => !v); setStatus("idle"); setMsg(null); }}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded font-medium">
        Giriş
      </button>
      {portal}
    </div>
  );
}
