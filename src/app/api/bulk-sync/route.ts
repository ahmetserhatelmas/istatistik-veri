import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getMatchIds, getMatchDetails } from "@/lib/oran-api";

const BATCH_SIZE = 25;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  const cur = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (cur <= end) {
    days.push(formatDate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

export async function POST(req: NextRequest) {
  const secret =
    req.headers.get("x-cron-secret") ||
    req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await req.json().catch(() => ({}));
  const dateFrom = body.dateFrom || "2019-01-01";
  const dateTo = body.dateTo || formatDate(new Date());
  const bookmaker = body.bookmaker || "0";
  const sport = body.sport || "FUTBOL";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };

      const supabase = createServiceClient();
      const days = eachDay(dateFrom, dateTo);

      send({
        type: "start",
        dateFrom,
        dateTo,
        totalDays: days.length,
      });

      let grandTotal = 0;
      let grandInserted = 0;
      let daysDone = 0;

      for (const day of days) {
        try {
          const dayIds = await getMatchIds(day, day, bookmaker, sport);

          if (dayIds.length === 0) {
            daysDone++;
            continue;
          }

          const { data: existing } = await supabase
            .from("matches")
            .select("id")
            .in("id", dayIds);
          const existingSet = new Set((existing || []).map((r) => r.id));
          const newIds = dayIds.filter((id) => !existingSet.has(id));

          let dayInserted = 0;

          for (let i = 0; i < newIds.length; i += BATCH_SIZE) {
            const chunk = newIds.slice(i, i + BATCH_SIZE);
            const rows = await getMatchDetails(chunk, bookmaker, sport);
            if (rows.length > 0) {
              const { error } = await supabase
                .from("matches")
                .upsert(rows, { onConflict: "id" });
              if (error) {
                send({ type: "error", day, error: error.message });
                continue;
              }
              dayInserted += rows.length;
            }
            await sleep(150);
          }

          grandTotal += dayIds.length;
          grandInserted += dayInserted;
          daysDone++;

          if (dayInserted > 0 || daysDone % 30 === 0) {
            send({
              type: "progress",
              day,
              daysDone,
              totalDays: days.length,
              pct: Math.round((daysDone / days.length) * 100),
              dayIds: dayIds.length,
              dayInserted,
              grandTotal,
              grandInserted,
            });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          send({ type: "error", day, error: message });
          daysDone++;
          await sleep(1000);
        }
      }

      send({
        type: "done",
        dateFrom,
        dateTo,
        daysProcessed: daysDone,
        grandTotal,
        grandInserted,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
