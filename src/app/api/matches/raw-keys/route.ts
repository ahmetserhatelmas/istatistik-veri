import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isRawKeyExcludedFromColumns } from "@/lib/columns";

/** raw_data içinde geçen tüm alan adlarının birleşimi — get_raw_data_keys() RPC ile hızlı (~1ms SQL) */
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("get_raw_data_keys");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const keys = ((data as string[]) ?? [])
      .filter((k) => !isRawKeyExcludedFromColumns(k))
      .sort();

    return NextResponse.json({ keys });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
