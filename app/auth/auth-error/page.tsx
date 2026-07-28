import Link from "next/link";

export default function AuthError() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <h1 className="text-xl font-bold text-stone-900 mb-2">Gagal Masuk</h1>
        <p className="text-sm text-stone-500 mb-6">
          Terjadi kesalahan saat memproses autentikasi Anda. Silakan coba masuk kembali.
        </p>
        <Link
          href="/login"
          className="inline-block px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition"
        >
          Kembali ke Halaman Masuk
        </Link>
      </div>
    </div>
  );
}
