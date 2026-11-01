import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Menyegarkan sesi Supabase dan menjaga route /admin (kecuali /admin/login).
 * Dipanggil dari proxy.ts (nama baru `middleware.ts` di Next.js 16).
 * Pengecekan is_admin() tetap dilakukan di server layout (lapis kedua).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Env belum diisi: perlakukan sebagai tanpa sesi (tetap redirect ke login, bukan 500).
    const { pathname } = request.nextUrl;
    if (pathname !== "/admin/login") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.search = "";
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Jangan taruh logic apa pun antara createServerClient dan getClaims.
  const { data } = await supabase.auth.getClaims();
  const hasSession = !!data?.claims;

  const { pathname } = request.nextUrl;
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLogin = pathname === "/admin/login";

  if (isAdminArea && !isLogin && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Sengaja tidak mengalihkan /admin/login saat ada sesi: akun non-admin masih
  // punya sesi dan harus bisa melihat pesan penolakan di halaman login.
  return response;
}
