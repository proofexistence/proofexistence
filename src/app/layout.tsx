import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Serif_TC } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.proofexistence.com/'),
  openGraph: {
    siteName: 'POE 2026',
    images: [
      {
        url: '/og-v2.png',
        width: 1200,
        height: 630,
        alt: 'POE 2026 - Proof of Existence',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-v2.png'],
    creator: '@Proofexist2006',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
};

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const notoSerifTC = Noto_Serif_TC({
  variable: '--font-noto-serif-tc',
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '900'],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get locale from next-intl
  const locale = await getLocale();

  // Root layout - locale-specific content is in [locale]/layout.tsx
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerifTC.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
