/**
 * Magic link / şifre sıfırlama PKCE dönüşü.
 *
 * Önemli: `cookies()` + düz `NextResponse.redirect()` ile dönünce Set-Cookie
 * bazen tarayıcıya gitmiyor → client’ta "Auth session missing". Çerezleri
 * doğrudan redirect yanıtına yazan `createServerClient` kullanıyoruz.
 */
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function sameOriginPath(raw: string | null): string {
  const s = (raw ?? "/").trim() || "/";
  if (!s.startsWith("/") || s.startsWith("//")) return "/";
  return s;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextPath = sameOriginPath(url.searchParams.get("next"));
  const okRedirect = NextResponse.redirect(new URL(nextPath, url.origin).toString());

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              okRedirect.cookies.set(name, value, options);
            }
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return okRedirect;
    }
    const errUrl = new URL(nextPath, url.origin);
    errUrl.searchParams.set("auth_error", error.message);
    return NextResponse.redirect(errUrl.toString());
  }

  const miss = new URL(nextPath, url.origin);
  miss.searchParams.set("auth_error", "missing_code");
  return NextResponse.redirect(miss.toString());
}
