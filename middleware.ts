import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware Next.js untuk:
 * 1. Me-refresh sesi Supabase (cookie) pada setiap request.
 * 2. Melindungi route — redirect ke halaman utama jika belum login.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // PENTING: Jangan tulis logika di antara createServerClient dan auth.getUser().
  // Kesalahan kecil dapat membuat sesi pengguna tidak ter-refresh dengan benar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api");

  // Lindungi API routes proyek — kembalikan 401 jika tidak ada sesi
  if (!user && pathname.startsWith("/api/projects")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Lindungi halaman (non-API) — redirect ke /login jika belum ada sesi,
  // atau jauhkan dari /login & / jika sudah login. /api/gemini* sengaja
  // tidak disentuh sama sekali oleh blok ini.
  if (!isApiRoute) {
    const isPublicPage = pathname === "/login" || pathname.startsWith("/auth");

    if (!user && !isPublicPage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      const redirectResponse = NextResponse.redirect(redirectUrl);
      supabaseResponse.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c));
      return redirectResponse;
    }

    if (user && (pathname === "/login" || pathname === "/")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      const redirectResponse = NextResponse.redirect(redirectUrl);
      supabaseResponse.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c));
      return redirectResponse;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match semua request path kecuali yang dimulai dengan:
     * - _next/static (file statis)
     * - _next/image (optimasi gambar)
     * - favicon.ico, sitemap.xml, robots.txt (metadata file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
