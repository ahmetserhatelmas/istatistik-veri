import { NextResponse } from "next/server";
import { getBalance } from "@/lib/oran-api";

export async function GET() {
  try {
    const balance = await getBalance();
    return NextResponse.json({ balance });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
