import { getTrailsForCol } from '@/lib/db/queries/get-trails-for-col';
import { ColCanvas } from '@/components/col/col-canvas';
import type { TrailPoint } from '@/components/col/types';

export const metadata = {
  title: 'Collective Art | Proof of Existence',
  description: 'Generative art visualization of collective light trails.',
};

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
    <div className="w-full h-[calc(100vh-5rem)] mt-20 overflow-hidden">
      <ColCanvas initialTrails={trails} />
    </div>
  );
}
