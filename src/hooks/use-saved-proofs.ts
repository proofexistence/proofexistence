import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSafe as useAuth } from '@/lib/clerk/safe-hooks';

type SavedResponse = {
  savedSessionIds: string[];
};

export function useSavedProofs() {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['saved-proofs'],
    queryFn: async () => {
      if (!isSignedIn) return { savedSessionIds: [] };
      const token = await getToken();
      const res = await fetch('/api/user/saved', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch saved proofs');
      return (await res.json()) as SavedResponse;
    },
    enabled: !!isSignedIn,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const savedIds = new Set(data?.savedSessionIds || []);

  const { mutate: toggleSave } = useMutation({
    mutationFn: async ({
      sessionId,
      isSaved,
    }: {
      sessionId: string;
      isSaved: boolean;
    }) => {
      const token = await getToken();
      // 'isSaved' here is the *current* state before toggle, so if true, we want to unsave
      const action = isSaved ? 'unsave' : 'save';

      const res = await fetch('/api/engagement/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
    onError: (err, newTodo, context) => {
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
