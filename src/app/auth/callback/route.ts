/**
 * Magic link / email OTP dönüş endpoint'i.
 *
 * Kullanıcı mailindeki linki tıklar → Supabase auth server `?code=...` ile
 * bu rotaya yönlendirir → `exchangeCodeForSession` ile oturum cookie'sine
 * yazılır → kullanıcıyı `next` paramı veya ana sayfaya yollar.
 */
import { createRouteClient } from "@/lib/supabase/route";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createRouteClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Hata olursa hata mesajını query olarak dön
    return NextResponse.redirect(`${origin}${next}?auth_error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}?auth_error=missing_code`);
}
