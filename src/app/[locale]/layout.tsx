import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Providers } from '@/providers/app-provider';
import { GlobalBackground } from '@/components/layout/global-background';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { LoadingBar } from '@/components/layout/loading-bar';
import { ReferralListener } from '@/components/auth/referral-listener';
import Script from 'next/script';
import { locales, type Locale } from '@/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Proof of Existence | A Year-Long Collective Art Experiment',
  description:
    'Join the movement. Leave your immutable trace on the blockchain. A year-long collective art project where every participant co-creates the final digital monument.',
  keywords: [
    'POE2026',
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
    url: 'https://www.proofexistence.com/',
    locale: 'en_US',
  },
  twitter: {
    title: 'Proof of Existence | A Year-Long Collective Art Experiment',
    description:
      'Join the movement. Leave your immutable trace on the blockchain. A year-long collective art project where every participant co-creates the final digital monument.',
  },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get messages for the current locale
  const messages = await getMessages();

  return (
    <>
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
      <NextIntlClientProvider messages={messages}>
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
      </NextIntlClientProvider>
    </>
  );
}
