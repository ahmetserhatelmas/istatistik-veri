"use client";

/**
 * Aynı hesapla başka cihazdan giriş yapılınca bu oturumu düşürür.
 * sql/add-auth-session-rev.sql + bump_auth_session_rev gerekir; yoksa sessizce atlanır.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";

const POLL_MS = 45_000;

export function storageKeySessionRev(userId: string) {
  return `orch_session_rev:${userId}`;
}

/** Giriş sonrası beklenen rev (AuthBar). */
export function recordSessionRevAfterLogin(userId: string, rev: number) {
  sessionStorage.setItem(storageKeySessionRev(userId), String(rev));
}

export function SessionRevGuard() {
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      userIdRef.current = uid;
      if (!uid) {
        return;
      }
      const res = await fetch("/api/auth/session-rev", { credentials: "same-origin" });
      if (!res.ok) return;
      const j = (await res.json()) as { ok?: boolean; rev?: number };
      if (!j.ok || typeof j.rev !== "number") return;
      const serverRev = j.rev;
      const key = storageKeySessionRev(uid);
      const raw = sessionStorage.getItem(key);
      const stored = raw != null && raw !== "" ? Number(raw) : NaN;
      if (!Number.isFinite(stored)) {
        sessionStorage.setItem(key, String(serverRev));
        return;
      }
      if (serverRev > stored) {
        sessionStorage.removeItem(key);
        await supabase.auth.signOut();
        window.location.reload();
      }
    };

    void check();
    interval = setInterval(() => void check(), POLL_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        const u = userIdRef.current;
        if (u) sessionStorage.removeItem(storageKeySessionRev(u));
        userIdRef.current = null;
      }
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        void check();
      }
    });

    return () => {
      if (interval) clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
