import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers/app-provider';
import { GlobalBackground } from '@/components/layout/global-background';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { LoadingBar } from '@/components/layout/loading-bar';
import { ReferralListener } from '@/components/auth/referral-listener';
import Script from 'next/script';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Proof of Existence | A Year-Long Collective Art Experiment',
  description:
    'Join the movement. Leave your immutable trace on the blockchain. A year-long collective art project where every participant co-creates the final digital monument.',
  metadataBase: new URL('https://proofexistence.com/'),
  keywords: [
    'blockchain',
    'NFT',
    'Polygon',
    'Web3',
    'art',
    'proof of existence',
    'digital art',
    'generative art',
  ],
  authors: [{ name: 'POE Team' }],
  openGraph: {
    title: 'Proof of Existence | A Year-Long Collective Art Experiment',
    description:
      'Join the movement. Leave your immutable trace on the blockchain. A year-long collective art project where every participant co-creates the final digital monument.',
    url: 'https://proofexistence.com/',
    siteName: 'POE 2026',
    images: [
      {
        url: 'https://proofexistence.com/og-v2.png',
        width: 1200,
        height: 630,
        alt: 'POE 2026 - Proof of Existence',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Proof of Existence | A Year-Long Collective Art Experiment',
    description:
      'Join the movement. Leave your immutable trace on the blockchain. A year-long collective art project where every participant co-creates the final digital monument.',
    images: ['https://proofexistence.com/og-v2.png'],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-SVQWPRD6ER"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-SVQWPRD6ER');
          `}
        </Script>
        <LoadingBar />
        <Providers>
          <div className="relative min-h-screen flex flex-col">
            <GlobalBackground />
            <header className="relative z-50">
              <ReferralListener />
              <Navbar />
            </header>
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
