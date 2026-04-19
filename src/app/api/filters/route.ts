/**
 * /api/filters — Kayıtlı filtre çekmeceleri (user-specific)
 *
 *   GET    /api/filters           → kullanıcının filtre listesi (en son güncellenen üstte)
 *   POST   /api/filters           → yeni filtre kaydet { name, payload }
 *   PATCH  /api/filters?id=...    → var olanı güncelle { name?, payload? }
 *   DELETE /api/filters?id=...    → sil
 *
 * Tüm işlemler RLS ile korunur (saved_filters tablosunda auth.uid() = user_id).
 * Oturum yoksa 401 döner.
 */
import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

export const maxDuration = 15;

interface SavedFilterPayload {
  [key: string]: unknown;
}

interface CreateBody {
  name: string;
  payload: SavedFilterPayload;
}

interface UpdateBody {
  name?: string;
  payload?: SavedFilterPayload;
}

async function requireUser() {
  const supabase = await createRouteClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null as null };
  return { supabase, user };
}

/** Liste: en son güncellenen üstte. */
export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("saved_filters")
    .select("id, name, payload, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, filters: data ?? [] });
}

/** Yeni filtre kaydet — aynı isim varsa 409. */
export async function POST(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
  }
  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz JSON" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name || name.length > 80) {
    return NextResponse.json({ ok: false, error: "İsim 1-80 karakter olmalı" }, { status: 400 });
  }
  if (!body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ ok: false, error: "payload zorunlu" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("saved_filters")
    .insert({ user_id: user.id, name, payload: body.payload })
    .select("id, name, payload, created_at, updated_at")
    .single();

  if (error) {
    // unique violation
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: "Bu isimde bir filtren zaten var" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, filter: data });
}

/** Güncelle: isim ve/veya payload. */
export async function PATCH(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "id zorunlu" }, { status: 400 });
  }

  let body: UpdateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (!n || n.length > 80) {
      return NextResponse.json({ ok: false, error: "İsim 1-80 karakter olmalı" }, { status: 400 });
    }
    patch.name = n;
  }
  if (body.payload && typeof body.payload === "object") {
    patch.payload = body.payload;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("saved_filters")
    .update(patch)
    .eq("id", id)
    .select("id, name, payload, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: "Bu isimde bir filtren zaten var" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, filter: data });
}

/** Sil. */
export async function DELETE(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "id zorunlu" }, { status: 400 });
  }

  const { error } = await supabase
    .from("saved_filters")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
