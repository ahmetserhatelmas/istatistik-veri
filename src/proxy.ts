/**
 * Supabase oturumunu otomatik yenileyen Next.js Proxy.
 *
 * Next.js 16'da `middleware.ts` → `proxy.ts` olarak yeniden adlandırıldı.
 * Davranış aynı: her istekte cookie'leri okur, gerekirse yeni access_token
 * cookie'sini response'a yazar. Böylece kullanıcının oturumu sessizce uzun
 * süre canlı kalır.
 *
 * Not: `/auth/callback` rotası bu proxy'den geçer; sorun yok.
 * Static asset'ler (next/image, public/) matcher ile dışlanır.
 */
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const p = req.nextUrl.pathname;
  if (
    p === "/api/matches" ||
    p === "/api/matches/raw-keys" ||
    p === "/api/sync-status" ||
    p === "/api/balance" ||
    p === "/api/filters"
  ) {
    return res;
  }

  // Oturum cookie'si yoksa Supabase'e ağ çağrısı yapma: ilk yük ve public istekler
  // DNS/ağ dalgalanmasında 20-30sn proxy beklemesine düşebiliyor.
  const hasSbAuthCookie = req.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (!hasSbAuthCookie) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            req.cookies.set(name, value);
          }
          res = NextResponse.next({ request: req });
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Access token'ı refresh eder. Ağ/Supabase gecikmesi veya geçici kesinti
  // (ETIMEDOUT vb.) tüm isteği düşürmesin — kullanıcı yine sayfayı görsün.
  try {
    await supabase.auth.getUser();
  } catch {
    /* sessiz */
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Aşağıdaki yollar HARİÇ her istek (dosya uzantılı statikler, _next, favicon):
     *  - _next/static, _next/image
     *  - favicon, logolar
     *  - public asset dosyaları (png, jpg, svg, webp, ico, mp4, mp3, woff*, css, js map'leri)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|mp4|mp3|woff|woff2|css|map)$).*)",
  ],
};
