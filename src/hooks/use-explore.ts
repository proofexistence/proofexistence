import { useInfiniteQuery } from '@tanstack/react-query';

interface Proof {
  id: string;
  createdAt: string;
  status: string;
  ipfsHash: string | null;
  title?: string | null;
  message?: string | null;
  views?: number;
  likes?: number;
  userName?: string | null;
  walletAddress?: string | null;
  previewUrl?: string | null;
}

interface ExploreData {
  proofs: Proof[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

interface ExploreFilters {
  search?: string;
  status?: string;
  sortBy?: string;
  timeframe?: string;
  themeOnly?: boolean;
}

export function useExplore(filters: ExploreFilters) {
  return useInfiniteQuery({
    queryKey: ['explore', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
        ...(filters.search && { search: filters.search }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.timeframe !== 'all' && { timeframe: filters.timeframe }),
        ...(filters.themeOnly && { themeOnly: 'true' }),
      });

      const res = await fetch(`/api/explore?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch explore data');
      }
      return res.json() as Promise<ExploreData>;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}
