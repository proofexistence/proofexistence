import type { Metadata } from 'next';
import { locales, defaultLocale } from '@/i18n/config';
import { HomeContent } from '@/components/home/home-content';

const BASE_URL = 'https://www.proofexistence.com';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;

  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l] = l === defaultLocale ? BASE_URL : `${BASE_URL}/${l}`;
  }
  languages['x-default'] = BASE_URL;

  return {
    alternates: {
      canonical: locale === defaultLocale ? BASE_URL : `${BASE_URL}/${locale}`,
      languages,
    },
  };
}

export default function Home() {
  return <HomeContent />;
}
