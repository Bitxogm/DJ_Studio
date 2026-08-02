import type { Metadata } from 'next';
import { Chakra_Petch, Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

// Chakra Petch: solo para branding/headings (font-display). El body sigue en
// Inter — a tamaños de párrafo, los ángulos cortados de Chakra Petch cansan la
// lectura (ver CLAUDE.md > Frontend > Tipografía).
const chakraPetch = Chakra_Petch({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'BeatForge',
  description: 'Electronic music production studio in the browser',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${chakraPetch.variable}`}>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
