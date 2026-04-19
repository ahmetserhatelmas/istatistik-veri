/**
 * Route Handler / Server Action bağlamında kullanıcı oturumunu okuyan
 * Supabase istemcisi. Cookie'leri Next `cookies()` API'si üzerinden taşır.
 *
 * Kullanım (API route):
 *   const supabase = await createRouteClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *
 * User-specific tablolar (ör. saved_filters) bu istemci üzerinden sorgulanır
 * ki RLS (`auth.uid() = user_id`) çalışsın. Tüm veri tablolarına (matches vb.)
 * hâlâ `createServiceClient()` ile erişilir.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createRouteClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component'lerden çağrılıyorsa cookie set edilemez; sessiz geçiyoruz.
          }
        },
      },
    },
  );
}
