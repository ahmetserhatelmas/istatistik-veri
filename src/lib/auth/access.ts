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

  const cols =
    "user_id,email,is_approved,approved_at,approved_by_email,created_at,updated_at" as const;

  const { data: existing, error: selErr } = await service
    .from("user_access")
    .select(cols)
    .eq("user_id", user.id)
    .maybeSingle();

  if (selErr) return null;

  if (existing) {
    // Satır varken upsert yapma: upsert her seferinde is_approved=false yazardı;
    // /api/auth/access-status her oturumda çağrıldığı için admin onayı anında silinirdi.
    const row = existing as AccessRow;
    if (normalizeEmail(row.email) !== email) {
      const { data: updated, error: updErr } = await service
        .from("user_access")
        .update({ email })
        .eq("user_id", user.id)
        .select(cols)
        .single();
      if (updErr) return null;
      return (updated as AccessRow) ?? null;
    }
    return row;
  }

  const { data, error } = await service
    .from("user_access")
    .insert({
      user_id: user.id,
      email,
      is_approved: admin,
      approved_at: admin ? new Date().toISOString() : null,
      approved_by_email: admin ? ADMIN_EMAIL : null,
    })
    .select(cols)
    .single();

  if (error) {
    // auth tetikleyicisi ile aynı anda satır oluşmuş olabilir
    const { data: again, error: againErr } = await service
      .from("user_access")
      .select(cols)
      .eq("user_id", user.id)
      .maybeSingle();
    if (againErr || !again) return null;
    return again as AccessRow;
  }

  return (data as AccessRow) ?? null;
}
