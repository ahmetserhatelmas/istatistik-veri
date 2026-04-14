import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isRawKeyExcludedFromColumns } from "@/lib/columns";

/** raw_data içinde geçen tüm alan adlarının birleşimi (örnek satırlardan; sütun paneli için) */
const SAMPLE = 2500;

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("matches")
      .select("raw_data")
      .order("tarih", { ascending: false })
      .limit(SAMPLE);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const keys = new Set<string>();
    for (const row of data ?? []) {
      const rd = row.raw_data as Record<string, unknown> | null;
      if (rd && typeof rd === "object" && !Array.isArray(rd)) {
        for (const k of Object.keys(rd)) {
          if (!isRawKeyExcludedFromColumns(k)) keys.add(k);
        }
      }
    }

    return NextResponse.json({ keys: Array.from(keys).sort() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
