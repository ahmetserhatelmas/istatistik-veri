import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/** Son başarılı senkron (cron veya manuel POST /api/sync) bitiş zamanı */
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("sync_log")
      .select("finished_at")
      .eq("status", "done")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const finishedAt = data?.finished_at as string | null | undefined;
    return NextResponse.json({ lastSyncAt: finishedAt ?? null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
