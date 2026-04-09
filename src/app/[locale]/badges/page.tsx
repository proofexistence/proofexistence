import { BadgesShowcase } from '@/components/badges/badges-showcase';

import { getTranslations } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.badges' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function BadgesPage() {
  return <BadgesShowcase />;
}
