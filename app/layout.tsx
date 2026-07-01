import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk, Outfit, Playfair_Display } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display-space',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display-outfit',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
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
      className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} ${outfit.variable} ${playfairDisplay.variable}`}
    >
      <body className="font-sans antialiased bg-slate-50 text-slate-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

