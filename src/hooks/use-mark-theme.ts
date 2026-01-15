import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWeb3Auth } from '@/lib/web3auth';

interface MarkThemeResult {
  success: boolean;
  reward: string;
  isNew: boolean;
}

interface UnmarkThemeResult {
  success: boolean;
  wasUnmarked: boolean;
}

export function useMarkTheme() {
  const { getIdToken, user } = useWeb3Auth();
  const queryClient = useQueryClient();

  const getHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = await getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (user?.walletAddress) {
      headers['X-Wallet-Address'] = user.walletAddress;
    }

    return headers;
  };

  const {
    mutate: markTheme,
    mutateAsync: markThemeAsync,
    isPending: isMarkPending,
    error: markError,
  } = useMutation({
    mutationFn: async (sessionId: string): Promise<MarkThemeResult> => {
      const headers = await getHeaders();

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

  const {
    mutate: unmarkTheme,
    mutateAsync: unmarkThemeAsync,
    isPending: isUnmarkPending,
    error: unmarkError,
  } = useMutation({
    mutationFn: async (): Promise<UnmarkThemeResult> => {
      const headers = await getHeaders();

      const res = await fetch('/api/quests/unmark-theme', {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to unmark theme');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests', 'today'] });
    },
    onError: (error) => {
      console.error('Unmark theme failed:', error);
    },
  });

  return {
    markTheme,
    markThemeAsync,
    unmarkTheme,
    unmarkThemeAsync,
    isPending: isMarkPending || isUnmarkPending,
    error: markError || unmarkError,
  };
}
