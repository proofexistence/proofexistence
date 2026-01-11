import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWeb3Auth } from '@/lib/web3auth';

interface ToggleVisibilityParams {
  sessionId: string;
  hidden: boolean;
}

export function useVisibility() {
  const { user } = useWeb3Auth();
  const queryClient = useQueryClient();

  const toggleVisibility = useMutation({
    mutationFn: async ({ sessionId, hidden }: ToggleVisibilityParams) => {
      if (!user?.walletAddress) throw new Error('Not authenticated');

      const res = await fetch(`/api/sessions/${sessionId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': user.walletAddress,
        },
        body: JSON.stringify({ hidden }),
      });

      if (!res.ok) {
        throw new Error('Failed to toggle visibility');
      }

      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['saved-proofs'] });
      queryClient.invalidateQueries({ queryKey: ['explore'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // If there's a specific query for the proof details, invalidate that too
      queryClient.invalidateQueries({ queryKey: ['proof', sessionId] });
    },
  });

  return { toggleVisibility };
}
