import type { Metadata } from 'next';
import { IBM_Plex_Sans, Source_Sans_3 } from 'next/font/google';
import './globals.css';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
  display: 'swap'
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-ibm-plex',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'AWED 0.1 Alpha',
  description: 'Agentic Web Experience Designer — schema-driven site studio',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${ibmPlex.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
