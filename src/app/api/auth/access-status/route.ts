import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";
import { createServiceClient } from "@/lib/supabase/server";
import { ensureAccessRow, isAdminEmail } from "@/lib/auth/access";

export const maxDuration = 15;

export async function GET() {
  const route = await createRouteClient();
  const { data: authData, error: authError } = await route.auth.getUser();
  const user = authData.user;
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
  }

  const service = createServiceClient();
  const row = await ensureAccessRow(service, user);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Onay bilgisi okunamadı" }, { status: 500 });
  }

  const isAdmin = isAdminEmail(user.email);
  return NextResponse.json({
    ok: true,
    approved: Boolean(row.is_approved),
    isAdmin,
    email: user.email ?? "",
    approvedAt: row.approved_at,
  });
}
