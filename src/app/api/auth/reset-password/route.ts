import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/auth/access";

export const maxDuration = 20;

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz JSON" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Geçerli bir e-posta girin" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: row, error: rowErr } = await service
    .from("user_access")
    .select("is_approved")
    .eq("email", email)
    .maybeSingle();

  if (rowErr) {
    return NextResponse.json({ ok: false, error: rowErr.message }, { status: 500 });
  }
  if (!row || !row.is_approved) {
    return NextResponse.json(
      { ok: false, error: "Şifre sıfırlama sadece onaylı hesaplar için açık." },
      { status: 403 },
    );
  }

  const origin = req.nextUrl.origin;
  const { error } = await service.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Şifre sıfırlama bağlantısı gönderildi." });
}
