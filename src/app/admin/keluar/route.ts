import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Keluar dari sesi admin. Dipakai juga saat akun login tapi bukan admin
 * (`?alasan=bukan-admin`): Server Component tidak bisa menghapus cookie, Route Handler bisa.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = new URL("/admin/login", request.url);
  if (request.nextUrl.searchParams.get("alasan") === "bukan-admin") {
    url.searchParams.set("error", "bukan-admin");
  }
  return NextResponse.redirect(url);
}
