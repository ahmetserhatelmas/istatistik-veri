import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { ADMIN_EMAIL, ensureAccessRow, isAdminEmail, normalizeEmail } from "@/lib/auth/access";

export const maxDuration = 20;

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz JSON" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const password = String(body.password ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Geçerli bir e-posta girin" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "Şifre en az 8 karakter olmalı" }, { status: 400 });
  }

  const service = createServiceClient();
  const makeAdmin = isAdminEmail(email);

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: email.split("@")[0] ?? email },
  });

  if (error) {
    if (/already registered|already exists|duplicate/i.test(error.message)) {
      return NextResponse.json({ ok: false, error: "Bu e-posta zaten kayıtlı" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!data.user?.id) {
    return NextResponse.json({ ok: false, error: "Kullanıcı oluşturulamadı" }, { status: 500 });
  }

  await ensureAccessRow(service, { id: data.user.id, email });

  return NextResponse.json({
    ok: true,
    userId: data.user.id,
    approved: makeAdmin,
    message: makeAdmin
      ? "Admin hesabı otomatik onaylandı."
      : `Kayıt alındı. Admin onayı bekleniyor (${ADMIN_EMAIL}).`,
  });
}
