import { getAllTrailsForLab } from '@/lib/db/queries/get-all-trails-for-lab';
import { TrailWalkers } from '@/components/lab/trail-walkers';

export const metadata = {
  title: 'Lab | Proof of Existence',
  description: 'Time-based generative art visualization of collective trails.',
};

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
    <div className="w-full h-screen bg-black overflow-hidden">
      <TrailWalkers trails={trails} />
    </div>
  );
}
