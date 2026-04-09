import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { runMatchesDateRangeSync } from "@/lib/sync-matches";

export const maxDuration = 300;

function authorize(req: NextRequest): boolean {
  const secret =
    req.headers.get("x-cron-secret") ||
    req.nextUrl.searchParams.get("secret");
  return secret === process.env.CRON_SECRET;
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dateFrom = body.dateFrom || new Date().toISOString().slice(0, 10);
  const dateTo = body.dateTo || dateFrom;
  const bookmaker = body.bookmaker || "0";
  const sport = body.sport || "FUTBOL";

  const supabase = createServiceClient();

  const { data: logRow } = await supabase
    .from("sync_log")
    .insert({ date_from: dateFrom, date_to: dateTo, status: "running" })
    .select("id")
    .single();
  const logId = logRow?.id;

  try {
    const { totalFetched, totalInserted, daysProcessed } =
      await runMatchesDateRangeSync(supabase, {
        dateFrom,
        dateTo,
        bookmaker,
        sport,
      });

    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          finished_at: new Date().toISOString(),
          matches_fetched: totalFetched,
          matches_inserted: totalInserted,
          status: "done",
        })
        .eq("id", logId);
    }

    return NextResponse.json({
      ok: true,
      dateFrom,
      dateTo,
      daysProcessed,
      totalFetched,
      totalInserted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status: "error",
          error: message,
          finished_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
