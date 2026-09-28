import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Page Free - Professional Printing Design Assistant',
  description: 'Aplikasi berbasis web pembuat desain produk percetakan seperti kartu nama dan sampul rapor dengan bantuan rekomendasi AI.',
  icons: {
    icon: '/pagefree.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={inter.variable}
    >
      <body className="font-sans antialiased bg-slate-50 text-slate-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

