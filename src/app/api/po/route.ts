import { NextResponse } from "next/server";
import { getPoInfo } from "@/lib/po";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getPoInfo();
  if (result.error !== null) {
    return NextResponse.json(result, {
      status: 500,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
  return NextResponse.json(result, {
    status: 200,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
