import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWeb3Auth } from '@/lib/web3auth';

interface ToggleNsfwParams {
  sessionId: string;
  nsfw: boolean;
}

export function useNsfwToggle() {
  const { user } = useWeb3Auth();
  const queryClient = useQueryClient();

  const toggleNsfw = useMutation({
    mutationFn: async ({ sessionId, nsfw }: ToggleNsfwParams) => {
      if (!user?.walletAddress) throw new Error('Not authenticated');

      const res = await fetch(`/api/admin/sessions/${sessionId}/nsfw`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': user.walletAddress,
        },
        body: JSON.stringify({ nsfw }),
      });

      if (!res.ok) {
        throw new Error('Failed to toggle NSFW');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['explore'] });
    },
  });

  return { toggleNsfw };
}
