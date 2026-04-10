import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { rollingUtcWindow, runMatchesDateRangeSync } from "@/lib/sync-matches";

export const maxDuration = 300;

function authorizeCron(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const bearer = req.headers.get("authorization");
  if (bearer === `Bearer ${expected}`) return true;

  const secret =
    req.headers.get("x-cron-secret") ||
    req.nextUrl.searchParams.get("secret");
  return secret === expected;
}

/**
 * Vercel Cron: GET /api/cron/sync (Authorization: Bearer CRON_SECRET otomatik).
 * Manuel: ?secret= veya x-cron-secret ile de tetiklenebilir.
 * Kapsam (UTC): CRON_SYNC_DAYS_PAST veya CRON_SYNC_DAYS (vars. 5) geriye;
 * CRON_SYNC_DAYS_FUTURE (vars. 45) ileri — OM’deki güncel fikstür penceresi.
 * Bitmiş maçlar: DB’de sonuc_ms dolu ise detay çekilmez (SYNC_SKIP_FINISHED_IN_DB=0 ile kapat).
 */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let past = Number(
    process.env.CRON_SYNC_DAYS_PAST || process.env.CRON_SYNC_DAYS || "5"
  );
  if (!Number.isFinite(past) || past < 1) past = 5;
  let future = Number(process.env.CRON_SYNC_DAYS_FUTURE ?? "45");
  if (!Number.isFinite(future) || future < 0) future = 45;
  const { dateFrom, dateTo } = rollingUtcWindow(past, future);
  const bookmaker = process.env.ORAN_BOOKMAKER || "0";
  const sport = process.env.ORAN_SPORT || "FUTBOL";
  const skipFinishedInDb = process.env.SYNC_SKIP_FINISHED_IN_DB !== "0";

  const supabase = createServiceClient();

  const { data: logRow } = await supabase
    .from("sync_log")
    .insert({
      date_from: dateFrom,
      date_to: dateTo,
      status: "running",
    })
    .select("id")
    .single();
  const logId = logRow?.id;

  try {
    const {
      totalFetched,
      totalInserted,
      totalSkippedFinished,
      daysProcessed,
    } = await runMatchesDateRangeSync(supabase, {
      dateFrom,
      dateTo,
      bookmaker,
      sport,
      skipFinishedInDb,
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
      source: "cron",
      dateFrom,
      dateTo,
      pastDays: past,
      futureDays: future,
      daysProcessed,
      totalFetched,
      totalInserted,
      totalSkippedFinished,
      skipFinishedInDb,
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
