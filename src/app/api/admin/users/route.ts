import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/access";

export const maxDuration = 20;

async function requireAdmin() {
  const route = await createRouteClient();
  const { data: authData, error } = await route.auth.getUser();
  const user = authData.user;
  if (error || !user || !isAdminEmail(user.email)) return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 403 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("user_access")
    .select("user_id,email,is_approved,approved_at,approved_by_email,created_at,updated_at")
    .order("is_approved", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, users: data ?? [] });
}
