import type { Metadata } from 'next';
import './landing-original.css';
import './globals.css';
import { Providers } from '@/providers/Providers';

export const metadata: Metadata = {
  title: {
    default: 'OFPHIL — Ophthalmological Foundation of the Philippines',
    template: '%s · OFPHIL',
  },
  description: 'Ophthalmological Foundation of the Philippines — Patient Master Registry & Clinical Directory',
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
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </head>
      <body className="landing-page antialiased" suppressHydrationWarning>{children ? <Providers>{children}</Providers> : null}</body>
    </html>
  );
}
