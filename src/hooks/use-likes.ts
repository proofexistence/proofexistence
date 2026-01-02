import { useMutation } from '@tanstack/react-query';
import { useWeb3Auth } from '@/lib/web3auth';

interface LikeMutationParams {
  sessionId: string;
  isLiked: boolean;
}

export function useLikes() {
  const { getIdToken, user } = useWeb3Auth();

  const { mutate: toggleLike, isPending } = useMutation({
    mutationFn: async ({ sessionId, isLiked }: LikeMutationParams) => {
      const action = isLiked ? 'unlike' : 'like';

      // Build headers based on auth method
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const token = await getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (user?.walletAddress) {
        headers['X-Wallet-Address'] = user.walletAddress;
      }

      const res = await fetch('/api/engagement/like', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId, action }),
      });

      if (!res.ok) {
        throw new Error('Failed to toggle like');
      }

      return { sessionId, action };
    },
    onError: (error) => {
      console.error('Like mutation failed:', error);
    },
  });

  return { toggleLike, isPending };
}
