import type { SupabaseClient } from "@supabase/supabase-js";
import { getMatchIds, getMatchDetails } from "@/lib/oran-api";

const BATCH_SIZE = 25;
const EXISTING_ID_CHUNK = 200;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function eachDayUtc(from: string, to: string): string[] {
  const days: string[] = [];
  const cur = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (cur <= end) {
    days.push(formatDate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

async function existingIdsForList(
  supabase: SupabaseClient,
  ids: number[]
): Promise<Set<number>> {
  const set = new Set<number>();
  for (let j = 0; j < ids.length; j += EXISTING_ID_CHUNK) {
    const slice = ids.slice(j, j + EXISTING_ID_CHUNK);
    const { data, error } = await supabase
      .from("matches")
      .select("id")
      .in("id", slice);
    if (error) throw new Error(error.message);
    for (const r of data || []) set.add(r.id as number);
  }
  return set;
}

export async function runMatchesDateRangeSync(
  supabase: SupabaseClient,
  opts: {
    dateFrom: string;
    dateTo: string;
    bookmaker?: string;
    sport?: string;
  }
): Promise<{ totalFetched: number; totalInserted: number; daysProcessed: number }> {
  const bookmaker = opts.bookmaker ?? "0";
  const sport = opts.sport ?? "FUTBOL";
  const days = eachDayUtc(opts.dateFrom, opts.dateTo);
  let totalFetched = 0;
  let totalInserted = 0;

  for (const day of days) {
    const dayIds = await getMatchIds(day, day, bookmaker, sport);
    if (dayIds.length === 0) continue;

    totalFetched += dayIds.length;

    const existingSet = await existingIdsForList(supabase, dayIds);
    const newIds = dayIds.filter((id) => !existingSet.has(id));

    for (let i = 0; i < newIds.length; i += BATCH_SIZE) {
      const chunk = newIds.slice(i, i + BATCH_SIZE);
      const rows = await getMatchDetails(chunk, bookmaker, sport);
      if (rows.length > 0) {
        const { error } = await supabase
          .from("matches")
          .upsert(rows, { onConflict: "id" });
        if (error) throw new Error(error.message);
        totalInserted += rows.length;
      }
      await sleep(200);
    }
  }

  return { totalFetched, totalInserted, daysProcessed: days.length };
}

/** Son N günü (bugün dahil) UTC tarihleriyle döndürür. */
export function rollingUtcRange(dayCount: number): { dateFrom: string; dateTo: string } {
  const safe = Math.min(Math.max(1, dayCount), 14);
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (safe - 1));
  return { dateFrom: formatDate(start), dateTo: formatDate(end) };
}
