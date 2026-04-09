import { getAllTrailsForLab } from '@/lib/db/queries/get-all-trails-for-lab';
import { TrailWalkers } from '@/components/lab/trail-walkers';

import { getTranslations } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.poe.lab' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export const dynamic = 'force-dynamic';

interface TrailData {
  x: number;
  y: number;
  z?: number;
  t?: number;
}

export default async function LabPage() {
  // Fetch all trails sorted by date (oldest first) for year-long visualization
  const rawTrails = await getAllTrailsForLab();

  const trails = rawTrails
    .filter((t) => Array.isArray(t.trailData) && t.trailData.length > 0)
    .map((t) => ({
      id: t.id,
      trailData: t.trailData as TrailData[],
      color: t.color || '#ffffff',
      duration: t.duration,
      userName: t.userName || undefined,
      title: t.title || undefined,
      createdAt: t.createdAt,
    }));

  return (
    <div className="w-full h-screen pt-32 flex flex-col items-center bg-black">
      <div className="text-center mb-8 px-4 animate-fade-in">
        <h1 className="text-3xl font-light text-white mb-2 tracking-tight">
          Walker POE
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto">
          Time-based generative art visualization of collective trails.
        </p>
      </div>
      <div className="w-full flex-1 overflow-hidden">
        <TrailWalkers trails={trails} />
      </div>
    </div>
  );
}
