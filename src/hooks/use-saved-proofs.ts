import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWeb3Auth } from '@/lib/web3auth';

type SavedResponse = {
  savedSessionIds: string[];
};

export function useSavedProofs() {
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

  const { data, isLoading } = useQuery({
    queryKey: ['saved-proofs'],
    queryFn: async () => {
      if (!isConnected) return { savedSessionIds: [] };
      const headers = await getAuthHeaders();
      const res = await fetch('/api/user/saved', { headers });
      if (!res.ok) throw new Error('Failed to fetch saved proofs');
      return (await res.json()) as SavedResponse;
    },
    enabled: isConnected,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Memoize Set creation to avoid creating new Set on every render
  const savedIds = useMemo(
    () => new Set(data?.savedSessionIds || []),
    [data?.savedSessionIds]
  );

  const { mutate: toggleSave } = useMutation({
    mutationFn: async ({
      sessionId,
      isSaved,
    }: {
      sessionId: string;
      isSaved: boolean;
    }) => {
      const headers = await getAuthHeaders();
      // 'isSaved' here is the *current* state before toggle, so if true, we want to unsave
      const action = isSaved ? 'unsave' : 'save';

      const res = await fetch('/api/engagement/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ sessionId, action }),
      });

      if (!res.ok) throw new Error('Failed to update save status');
      return { sessionId, action };
    },
    onMutate: async ({ sessionId, isSaved }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['saved-proofs'] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<SavedResponse>([
        'saved-proofs',
      ]);

      // Optimistic update
      queryClient.setQueryData<SavedResponse>(['saved-proofs'], (old) => {
        if (!old) return { savedSessionIds: [] };
        const newIds = new Set(old.savedSessionIds);
        if (isSaved) {
          newIds.delete(sessionId);
        } else {
          newIds.add(sessionId);
        }
        return { savedSessionIds: Array.from(newIds) };
      });

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['saved-proofs'], context?.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-proofs'] });
    },
  });

  return {
    savedIds,
    isLoading,
    toggleSave,
  };
}
