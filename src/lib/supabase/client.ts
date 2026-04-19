/**
 * Tarayıcı tarafı Supabase istemcisi (SSR-uyumlu, cookie-backed oturum).
 *
 * Bu istemci oturum token'larını cookie üzerinden taşır — kullanıcı magic link
 * ile giriş yapınca tüm `supabase.*` çağrıları otomatik olarak oturum başlığı
 * taşır. Giriş yapmamış kullanıcılar için davranış anon ile aynı kalır.
 *
 * Not: Mevcut `/api/*` endpoint'leri service_role ile çalıştığı için bu
 * değişiklik veriye erişim davranışını bozmaz; yalnızca client-side
 * Auth akışını ve ileride eklenecek user-specific tabloları destekler.
 */
import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
