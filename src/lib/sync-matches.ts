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

/** DB’de kesin sonuç varsa (MS skoru) bu maç için detay çekmeyi atlarız — kredi + gereksiz trafik. */
function hasStoredFinalScore(sonuc_ms: string | null | undefined): boolean {
  if (sonuc_ms == null) return false;
  const s = String(sonuc_ms).trim();
  if (s === "" || s === "-" || s === "–") return false;
  return true;
}

type DbMatchSyncMeta = { tarih: string; sonuc_ms: string | null };

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

async function existingSyncMetaForIds(
  supabase: SupabaseClient,
  ids: number[]
): Promise<Map<number, DbMatchSyncMeta>> {
  const map = new Map<number, DbMatchSyncMeta>();
  for (let j = 0; j < ids.length; j += EXISTING_ID_CHUNK) {
    const slice = ids.slice(j, j + EXISTING_ID_CHUNK);
    const { data, error } = await supabase
      .from("matches")
      .select("id, tarih, sonuc_ms")
      .in("id", slice);
    if (error) throw new Error(error.message);
    for (const r of data || []) {
      const rawTarih = r.tarih as string;
      const tarih =
        typeof rawTarih === "string" ? rawTarih.slice(0, 10) : String(rawTarih);
      map.set(r.id as number, {
        tarih,
        sonuc_ms: (r.sonuc_ms as string | null) ?? null,
      });
    }
  }
  return map;
}

function idsNeedingDetail(
  dayIds: number[],
  metaById: Map<number, DbMatchSyncMeta>,
  skipFinishedInDb: boolean
): number[] {
  if (!skipFinishedInDb) return dayIds;
  return dayIds.filter((id) => {
    const row = metaById.get(id);
    if (!row) return true;
    return !hasStoredFinalScore(row.sonuc_ms);
  });
}

export async function runMatchesDateRangeSync(
  supabase: SupabaseClient,
  opts: {
    dateFrom: string;
    dateTo: string;
    bookmaker?: string;
    sport?: string;
    /**
     * true: DB’de sonuc_ms dolu (bitmiş) maçlar için detay çağrısı yapılmaz.
     * false: tarihsel backfill / tam yenileme (ağır).
     */
    skipFinishedInDb?: boolean;
  }
): Promise<{
  totalFetched: number;
  totalInserted: number;
  totalSkippedFinished: number;
  daysProcessed: number;
}> {
  const bookmaker = opts.bookmaker ?? "0";
  const sport = opts.sport ?? "FUTBOL";
  const skipFinishedInDb = opts.skipFinishedInDb !== false;
  const days = eachDayUtc(opts.dateFrom, opts.dateTo);
  let totalFetched = 0;
  let totalInserted = 0;
  let totalSkippedFinished = 0;

  for (const day of days) {
    const dayIds = await getMatchIds(day, day, bookmaker, sport);
    if (dayIds.length === 0) continue;

    totalFetched += dayIds.length;

    const metaById = await existingSyncMetaForIds(supabase, dayIds);
    const toFetch = idsNeedingDetail(dayIds, metaById, skipFinishedInDb);
    totalSkippedFinished += dayIds.length - toFetch.length;

    for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
      const chunk = toFetch.slice(i, i + BATCH_SIZE);
      const rows = await getMatchDetails(chunk, bookmaker, sport);
      if (rows.length > 0) {
        const stamped = rows.map((r) => ({
          ...r,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase
          .from("matches")
          .upsert(stamped, { onConflict: "id" });
        if (error) throw new Error(error.message);
        totalInserted += rows.length;
      }
      await sleep(200);
    }
  }

  return {
    totalFetched,
    totalInserted,
    totalSkippedFinished,
    daysProcessed: days.length,
  };
}

/**
 * UTC takvim “bugünü” merkez alır: geçmiş (bugün dahil) + ileri günler.
 * Harici oran API’sinde görünen ileri tarihli maçlar MacIdListesi’nde maç tarihine göre döner;
 * sadece geçmişe bakmak bu ID’leri hiç sorgulamaz.
 */
export function rollingUtcWindow(
  pastDays: number,
  futureDays: number
): { dateFrom: string; dateTo: string } {
  const p = Number.isFinite(pastDays) ? pastDays : 5;
  const f = Number.isFinite(futureDays) ? futureDays : 45;
  const past = Math.min(Math.max(1, Math.floor(p)), 90);
  const future = Math.min(Math.max(0, Math.floor(f)), 180);
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const start = new Date(todayUtc);
  start.setUTCDate(start.getUTCDate() - (past - 1));
  const end = new Date(todayUtc);
  end.setUTCDate(end.getUTCDate() + future);
  return { dateFrom: formatDate(start), dateTo: formatDate(end) };
}

/** Sadece geçmişe dönük pencere (bugün dahil son N gün). İleri fikstür içermez. */
export function rollingUtcRange(dayCount: number): { dateFrom: string; dateTo: string } {
  return rollingUtcWindow(dayCount, 0);
}
