import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWeb3Auth } from '@/lib/web3auth';

interface MarkThemeResult {
  success: boolean;
  reward: string;
  isNew: boolean;
}

export function useMarkTheme() {
  const { getIdToken, user } = useWeb3Auth();
  const queryClient = useQueryClient();

  const {
    mutate: markTheme,
    mutateAsync: markThemeAsync,
    isPending,
    error,
  } = useMutation({
    mutationFn: async (sessionId: string): Promise<MarkThemeResult> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const token = await getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (user?.walletAddress) {
        headers['X-Wallet-Address'] = user.walletAddress;
      }

      const res = await fetch('/api/quests/mark-theme', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to mark theme');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests', 'today'] });
    },
    onError: (error) => {
      console.error('Mark theme failed:', error);
    },
  });

  return { markTheme, markThemeAsync, isPending, error };
}
