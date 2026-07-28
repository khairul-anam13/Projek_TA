import { redirect } from "next/navigation";

/**
 * Middleware sudah meng-handle redirect "/" ke /dashboard atau /login
 * berdasarkan status autentikasi. Halaman ini murni jaring pengaman kalau
 * middleware ter-bypass/misconfigured.
 */
export default function Home() {
  redirect("/dashboard");
}
