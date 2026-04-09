import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { rollingUtcRange, runMatchesDateRangeSync } from "@/lib/sync-matches";

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
 * Kapsam: CRON_SYNC_DAYS (varsayılan 5) — bugün dahil son N gün UTC.
 */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dayCount = Number(process.env.CRON_SYNC_DAYS || "5");
  const { dateFrom, dateTo } = rollingUtcRange(dayCount);
  const bookmaker = process.env.ORAN_BOOKMAKER || "0";
  const sport = process.env.ORAN_SPORT || "FUTBOL";

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
      source: "cron",
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
