"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { AuthBar } from "@/app/AuthBar";

const MatchTable = dynamic(() => import("./MatchTable"), { ssr: false });

/**
 * Ana sayfa: oturum yoksa tam ekran giriş; onaylı oturumda maç tablosu.
 * (AuthBar içinde zaten onaysız hesap signOut edilir.)
 */
export function MatchTableGate() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600">
        Yükleniyor…
      </div>
    );
  }

  if (!user) {
    return <AuthBar variant="gate" gateHydrated />;
  }

  return <MatchTable />;
}
