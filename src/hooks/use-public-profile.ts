'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

// Types matching the API response from getProfile
export interface PublicProfile {
  user: {
    id: string;
    clerkId: string | null;
    name: string | null;
    walletAddress: string;
    avatarUrl: string | null;
    createdAt: string;
  };
  createdProofs: Array<{
    id: string;
    createdAt: string;
    status: string;
    ipfsHash: string | null;
    message: string | null;
    views: number | null;
    likes: number | null;
    title: string | null;
    previewUrl: string | null;
    hidden: number;
    userName: string | null;
    walletAddress: string | null;
  }>;
  savedProofs: Array<{
    id: string | null;
    createdAt: string | null;
    status: string | null;
    ipfsHash: string | null;
    message: string | null;
    views: number | null;
    likes: number | null;
    title: string | null;
    previewUrl: string | null;
    userName: string | null;
    walletAddress: string | null;
  }>;
  badges: Array<{
    id: string | null;
    name: string | null;
    description: string | null;
    imageUrl: string | null;
    awardedAt: string | null;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Hook to fetch any user's public profile by username or wallet address
 * Uses React Query for caching
 *
 * @param identifier - Username or wallet address to look up
 * @param viewerWalletAddress - Current user's wallet address (to show hidden sessions if viewing own profile)
 */
export function usePublicProfile(
  identifier: string | undefined,
  viewerWalletAddress?: string
) {
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['public-profile', identifier, viewerWalletAddress],
    queryFn: async (): Promise<PublicProfile | null> => {
      if (!identifier) return null;

      const headers: Record<string, string> = {};
      if (viewerWalletAddress) {
        headers['X-Wallet-Address'] = viewerWalletAddress;
      }

      const res = await fetch(
        `/api/profile/${encodeURIComponent(identifier)}`,
        {
          headers,
        }
      );

      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch profile');
      }

      return res.json();
    },
    enabled: !!identifier,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    profile,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch more sessions with infinite scroll
 */
export function useProfileSessions(
  identifier: string | undefined,
  viewerWalletAddress?: string
) {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['profile-sessions', identifier, viewerWalletAddress],
    queryFn: async ({ pageParam = 0 }): Promise<PublicProfile | null> => {
      if (!identifier) return null;

      const headers: Record<string, string> = {};
      if (viewerWalletAddress) {
        headers['X-Wallet-Address'] = viewerWalletAddress;
      }

      const res = await fetch(
        `/api/profile/${encodeURIComponent(identifier)}?limit=20&offset=${pageParam}`,
        { headers }
      );

      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch profile');
      }

      return res.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.pagination?.hasMore) return undefined;
      return lastPage.pagination.offset + lastPage.pagination.limit;
    },
    enabled: !!identifier,
    staleTime: 1000 * 60 * 5,
  });

  // Combine all pages of sessions
  const allSessions =
    data?.pages.flatMap((page) => page?.createdProofs || []) || [];
  const firstPage = data?.pages[0];

  return {
    profile: firstPage
      ? {
          ...firstPage,
          createdProofs: allSessions,
        }
      : null,
    isLoading,
    isFetchingNextPage,
    hasNextPage: !!hasNextPage,
    fetchNextPage,
    refetch,
  };
}
