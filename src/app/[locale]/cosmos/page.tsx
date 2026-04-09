import { getActiveTrails } from '@/lib/db/queries/get-active-trails';
import { CosmosCanvas } from '@/components/cosmos/cosmos-canvas';
import { CosmosTrail } from '@/components/cosmos/types';

import { getTranslations } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.cosmos' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export const revalidate = 60; // Refresh every minute

// Fix Type Error: props must be defined for searchParams
export default async function CosmosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const highlightId =
    typeof resolvedSearchParams?.highlight === 'string'
      ? resolvedSearchParams.highlight
      : undefined;

  const rawTrails = await getActiveTrails(5000); // Fetch up to 5000 trails for massive density

  // Filter and map trails to match CosmosTrail interface
  const trails: CosmosTrail[] = rawTrails
    .filter((t) => Array.isArray(t.trailData) && t.trailData.length > 0)
    .map((t) => ({
      ...t,
      trailData: t.trailData as {
        x: number;
        y: number;
        z?: number;
        t?: number;
      }[],
      color: t.color || undefined,
      userName: t.userName || undefined,
      walletAddress: t.walletAddress || undefined,
      title: t.title || undefined,
      message: t.message || undefined,
    }));

  return (
    <div className="w-full h-screen relative bg-black">
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <CosmosCanvas trails={trails} highlightId={highlightId} />
      </div>
    </div>
  );
}
