import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail, normalizeEmail } from "@/lib/auth/access";

export const maxDuration = 20;

async function requireAdminEmail(): Promise<string | null> {
  const route = await createRouteClient();
  const { data: authData, error } = await route.auth.getUser();
  const user = authData.user;
  if (error || !user || !isAdminEmail(user.email)) return null;
  return normalizeEmail(user.email ?? "");
}

export async function POST(req: NextRequest) {
  const adminEmail = await requireAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 403 });
  }

  let body: { userId?: string; approved?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz JSON" }, { status: 400 });
  }

  const userId = String(body.userId ?? "").trim();
  const approved = body.approved !== false;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId zorunlu" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("user_access")
    .update({
      is_approved: approved,
      approved_at: approved ? new Date().toISOString() : null,
      approved_by_email: approved ? adminEmail : null,
    })
    .eq("user_id", userId)
    .select("user_id,email,is_approved,approved_at,approved_by_email,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, user: data });
}
