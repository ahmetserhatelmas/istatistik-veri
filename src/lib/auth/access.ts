import type { SupabaseClient, User } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "ahmetserhatelmas@gmail.com";

export type AccessRow = {
  user_id: string;
  email: string;
  is_approved: boolean;
  approved_at: string | null;
  approved_by_email: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeEmail(email: string): string {
  return String(email ?? "").trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return normalizeEmail(email) === ADMIN_EMAIL;
}

export async function ensureAccessRow(
  service: SupabaseClient,
  user: Pick<User, "id" | "email">,
): Promise<AccessRow | null> {
  const email = normalizeEmail(user.email ?? "");
  if (!email) return null;
  const admin = isAdminEmail(email);

  const { data, error } = await service
    .from("user_access")
    .upsert(
      {
        user_id: user.id,
        email,
        is_approved: admin,
        approved_at: admin ? new Date().toISOString() : null,
        approved_by_email: admin ? ADMIN_EMAIL : null,
      },
      { onConflict: "user_id" },
    )
    .select("user_id,email,is_approved,approved_at,approved_by_email,created_at,updated_at")
    .single();

  if (error) return null;
  return (data as AccessRow) ?? null;
}
