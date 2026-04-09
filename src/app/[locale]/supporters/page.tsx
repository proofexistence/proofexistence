import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SupportersClient } from './supporters-client';

interface SupportersPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: SupportersPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.supporters' });

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      images: [
        {
          url: '/og-v2.png',
          width: 1200,
          height: 630,
          alt: `Supporters - ${t('title')}`,
        },
      ],
    },
  };
}

export default function SupportersPage() {
  return <SupportersClient />;
}
