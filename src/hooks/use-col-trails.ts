import { useQuery } from '@tanstack/react-query';
import type { ColTrailsResponse } from '@/components/col/types';

interface UseColTrailsParams {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

export function useColTrails({
  startDate,
  endDate,
  enabled = true,
}: UseColTrailsParams) {
  return useQuery({
    queryKey: [
      'col-trails',
      startDate.toISOString(),
      endDate.toISOString(),
    ],
    queryFn: async (): Promise<ColTrailsResponse> => {
      const params = new URLSearchParams();
      params.set('start', startDate.toISOString());
      params.set('end', endDate.toISOString());

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
