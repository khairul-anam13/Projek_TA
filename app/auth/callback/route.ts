import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Route Handler untuk OAuth Callback.
 *
 * Setelah Google menyelesaikan proses autentikasi, Supabase mengarahkan
 * pengguna ke URL ini dengan `code` sebagai parameter query.
 * Handler ini menukar `code` tersebut menjadi sesi aktif (cookie)
 * lalu me-redirect pengguna ke halaman utama (dashboard).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` bisa digunakan untuk menyimpan URL tujuan awal sebelum login
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        // Di environment lokal, tidak ada reverse proxy
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Jika terjadi error, redirect ke halaman utama dengan pesan error
  console.error("[Auth Callback] Gagal menukar code dengan sesi.");
  return NextResponse.redirect(`${origin}/auth/auth-error`);
}
