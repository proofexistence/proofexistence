import { Suspense } from 'react';
import {
  getSessionsByDate,
  getAvailableDates,
} from '@/lib/db/queries/get-sessions-by-date';
import { DailyArtCanvas } from '@/components/daily-art';
import type { TrailPoint } from '@/components/daily-art';

export const metadata = {
  title: 'Daily Art | Proof of Existence',
  description:
    'Time Ripples - Daily collective art visualization where sessions expand from center to edge like ripples in time.',
};

export const dynamic = 'force-dynamic';

export default async function DailyArtPage() {
  // Get available dates
  const availableDates = await getAvailableDates();

  // Default to today or most recent available date
  const today = new Date().toISOString().split('T')[0];
  const initialDate = availableDates.includes(today)
    ? today
    : availableDates[0] || today;

  // Fetch sessions for initial date
  const date = new Date(initialDate + 'T00:00:00Z');
  const rawSessions = await getSessionsByDate(date);

  const sessions = rawSessions
    .filter((s) => Array.isArray(s.trailData) && s.trailData.length > 0)
    .map((s) => ({
      id: s.id,
      trailData: s.trailData as TrailPoint[],
      color: s.color || '#ffffff',
      duration: s.duration,
      createdAt: s.createdAt.toISOString(),
      userName: s.userName || undefined,
      title: s.title || undefined,
    }));

  return (
    <div className="w-full h-[calc(100vh-5rem)] mt-20 overflow-hidden">
      <Suspense fallback={<div className="flex items-center justify-center h-full text-zinc-400">Loading...</div>}>
        <DailyArtCanvas
          initialSessions={sessions}
          initialDate={initialDate}
          availableDates={availableDates}
        />
      </Suspense>
    </div>
  );
}
