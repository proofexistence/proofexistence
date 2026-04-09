import { getTrailsForCol } from '@/lib/db/queries/get-trails-for-col';
import { ColCanvas } from '@/components/col/col-canvas';
import type { TrailPoint } from '@/components/col/types';

import { getTranslations } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.poe.col' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export const dynamic = 'force-dynamic';

export default async function ColPage() {
  // Default to last year for more data
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);

  const rawTrails = await getTrailsForCol({ startDate, endDate });

  const trails = rawTrails
    .filter((t) => Array.isArray(t.trailData) && t.trailData.length > 0)
    .map((t) => ({
      id: t.id,
      trailData: t.trailData as TrailPoint[],
      color: t.color || '#ffffff',
      createdAt: t.createdAt.toISOString(),
      duration: t.duration,
      userName: t.userName || undefined,
      title: t.title || undefined,
    }));

  return (
    <div className="w-full h-screen pt-32 flex flex-col items-center">
      <div className="text-center mb-8 px-4 animate-fade-in">
        <h1 className="text-3xl font-light text-white mb-2 tracking-tight">
          Orbit POE
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto">
          Generative art visualization of collective light trails over time.
        </p>
      </div>
      <div className="w-full flex-1 overflow-hidden">
        <ColCanvas initialTrails={trails} />
      </div>
    </div>
  );
}
