import { useQuery } from '@tanstack/react-query';
import type { ColTrailsResponse, TimeRange } from '@/components/col/types';

interface UseColTrailsParams {
  range: TimeRange;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}

export function useColTrails({
  range,
  startDate,
  endDate,
  enabled = true,
}: UseColTrailsParams) {
  return useQuery({
    queryKey: [
      'col-trails',
      range,
      startDate?.toISOString(),
      endDate?.toISOString(),
    ],
    queryFn: async (): Promise<ColTrailsResponse> => {
      const params = new URLSearchParams();
      params.set('range', range);

      if (startDate) {
        params.set('start', startDate.toISOString());
      }
      if (endDate) {
        params.set('end', endDate.toISOString());
      }

      const res = await fetch(`/api/col/trails?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch trails');
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}
