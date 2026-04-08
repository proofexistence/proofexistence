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

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;

  // Map app locales to OG locales
  const ogLocales: Record<string, string> = {
    en: 'en_US',
    zh: 'zh_TW',
    cn: 'zh_CN',
    es: 'es_ES',
    ja: 'ja_JP',
    fr: 'fr_FR',
  };

  return {
    title: 'Proof of Existence | A Year-Long Collective Art Experiment',
    description:
      'Join the movement. Leave your immutable trace on the blockchain. A collective art project where every participant co-creates the final digital monument.',
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
      siteName: 'POE 2026',
      title: 'Proof of Existence | A Year-Long Collective Art Experiment',
      description:
        'Join the movement. Leave your immutable trace on the blockchain. A collective art project where every participant co-creates the final digital monument.',
      url: `https://www.proofexistence.com/${locale}`,
      images: [
        {
          url: '/og-v2.png',
          width: 1200,
          height: 630,
          alt: 'Proof of Existence',
        },
      ],
      locale: ogLocales[locale] || 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Proof of Existence | A Year-Long Collective Art Experiment',
      description:
        'Join the movement. Leave your immutable trace on the blockchain. A collective art project where every participant co-creates the final digital monument.',
      images: ['/og-v2.png'],
      creator: '@Proofexist2006',
    },
  };
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.proofexistence.com/#website',
      url: 'https://www.proofexistence.com',
      name: 'Proof of Existence',
      alternateName: [
        'POE 2026',
        'ProofExistence',
        'Proof Existence',
        'proofexistence',
      ],
      description:
        'A year-long collective art experiment where every participant co-creates an immutable digital monument on the blockchain.',
      inLanguage: ['en', 'zh-Hant', 'zh-Hans', 'es', 'ja', 'fr'],
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.proofexistence.com/#organization',
      name: 'Proof of Existence',
      alternateName: ['POE 2026', 'POE Team'],
      url: 'https://www.proofexistence.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.proofexistence.com/favicon-96x96.png',
      },
      sameAs: ['https://x.com/Proofexist2006'],
    },
  ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
