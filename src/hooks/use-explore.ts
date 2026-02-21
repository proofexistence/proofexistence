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
  nsfw?: boolean;
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
  showNsfw?: boolean;
  walletAddress?: string;
}

export function useExplore(filters: ExploreFilters) {
  // Only include walletAddress in query key when showNsfw is false
  // (it affects which NSFW content is visible: own vs others)
  // When showNsfw is true, all NSFW content is shown regardless of wallet
  const { walletAddress, ...filterKey } = filters;
  const effectiveWallet = !filters.showNsfw ? walletAddress : undefined;

  return useInfiniteQuery({
    queryKey: ['explore', { ...filterKey, walletAddress: effectiveWallet }],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
        ...(filters.search && { search: filters.search }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.timeframe !== 'all' && { timeframe: filters.timeframe }),
        ...(filters.themeOnly && { themeOnly: 'true' }),
        ...(filters.showNsfw && { showNsfw: 'true' }),
        ...(effectiveWallet && { walletAddress: effectiveWallet }),
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
