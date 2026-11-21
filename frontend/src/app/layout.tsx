import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/providers/Providers';

export const metadata: Metadata = {
  title: 'OFPHIL V2 — Clinical Management & Eligibility System',
  description: 'Ophthalmological Foundation Decision Support System — Experimental Multimodal Classifier & OCR Benchmarks',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;1,400&family=Outfit:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/png" href="/icons/ophil-logo.png" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
