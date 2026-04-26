import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 15;

/** Mevcut rev (kendi oturumu; diğer cihazla karşılaştırma için). */
export async function GET() {
  const route = await createRouteClient();
  const { data: authData, error: authError } = await route.auth.getUser();
  const user = authData.user;
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("auth_session_rev")
    .select("rev")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: true, rev: 0, degraded: true });
  }

  const rev = typeof data?.rev === "number" ? data.rev : Number(data?.rev ?? 0);
  return NextResponse.json({ ok: true, rev: Number.isFinite(rev) ? rev : 0 });
}

/** Yeni girişte çağrılır: rev + 1; aynı e-posta ile başka cihazdaki oturumlar bir sonraki GET'te düşer. */
export async function POST() {
  const route = await createRouteClient();
  const { data: authData, error: authError } = await route.auth.getUser();
  const user = authData.user;
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: row, error } = await service.rpc("bump_auth_session_rev", { p_user_id: user.id });

  if (error) {
    const missing =
      error.message?.includes("bump_auth_session_rev") ||
      error.code === "PGRST202" ||
      error.message?.includes("schema cache");
    if (missing) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oturum revizyonu için SQL eksik. sql/add-auth-session-rev.sql dosyasını Supabase SQL Editor'de çalıştırın (tablo + bump_auth_session_rev).",
          code: "SESSION_REV_FN_MISSING",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message, code: "SESSION_REV_BUMP" },
      { status: 500 },
    );
  }

  const rev = typeof row === "number" ? row : Number(row);
  return NextResponse.json({ ok: true, rev: Number.isFinite(rev) ? rev : 0 });
}
