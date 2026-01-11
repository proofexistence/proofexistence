import { useQuery } from '@tanstack/react-query';

export type RankingEntry = {
  id: string;
  userName: string | null;
  walletAddress: string | null;
  duration: number;
  likes: number;
  views: number;
  message: string | null;
};

export type RankingData = {
  topDuration: RankingEntry[];
  mostLiked: RankingEntry[];
  mostViewed: RankingEntry[];
};

export function useRankings() {
  return useQuery({
    queryKey: ['rankings'],
    queryFn: async () => {
      const response = await fetch('/api/rankings');
      if (!response.ok) {
        throw new Error('Failed to fetch rankings');
      }
      return response.json() as Promise<RankingData>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
