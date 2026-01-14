import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWeb3Auth } from '@/lib/web3auth';

type LikedResponse = {
  likedSessionIds: string[];
};

export function useLikes() {
  const { getIdToken, user, isConnected } = useWeb3Auth();
  const queryClient = useQueryClient();

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {};
    const token = await getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (user?.walletAddress) {
      headers['X-Wallet-Address'] = user.walletAddress;
    }
    return headers;
  };

  // Fetch user's liked session IDs
  const { data, isLoading } = useQuery({
    queryKey: ['liked-proofs'],
    queryFn: async () => {
      if (!isConnected) return { likedSessionIds: [] };
      const headers = await getAuthHeaders();
      const res = await fetch('/api/user/liked', { headers });
      if (!res.ok) throw new Error('Failed to fetch liked proofs');
      return (await res.json()) as LikedResponse;
    },
    enabled: isConnected,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Memoize Set creation to avoid creating new Set on every render
  const likedIds = useMemo(
    () => new Set(data?.likedSessionIds || []),
    [data?.likedSessionIds]
  );

  // Toggle like mutation with optimistic updates
  const { mutate: toggleLike, isPending } = useMutation({
    mutationFn: async ({
      sessionId,
      isLiked,
    }: {
      sessionId: string;
      isLiked: boolean;
    }) => {
      const headers = await getAuthHeaders();
      const action = isLiked ? 'unlike' : 'like';

      const res = await fetch('/api/engagement/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ sessionId, action }),
      });

      if (!res.ok) throw new Error('Failed to toggle like');
      return { sessionId, action };
    },
    onMutate: async ({ sessionId, isLiked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['liked-proofs'] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<LikedResponse>([
        'liked-proofs',
      ]);

      // Optimistic update
      queryClient.setQueryData<LikedResponse>(['liked-proofs'], (old) => {
        if (!old) return { likedSessionIds: [] };
        const newIds = new Set(old.likedSessionIds);
        if (isLiked) {
          newIds.delete(sessionId);
        } else {
          newIds.add(sessionId);
        }
        return { likedSessionIds: Array.from(newIds) };
      });

      return { previousData };
    },
    onError: (err, _variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['liked-proofs'], context?.previousData);
      console.error('Like mutation failed:', err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['liked-proofs'] });
    },
  });

  return {
    likedIds,
    isLoading,
    toggleLike,
    isPending,
  };
}
