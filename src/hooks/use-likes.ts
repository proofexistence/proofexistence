import { useMutation } from '@tanstack/react-query';
import { useAuthSafe as useAuth } from '@/lib/clerk/safe-hooks';

interface LikeMutationParams {
  sessionId: string;
  isLiked: boolean;
}

export function useLikes() {
  const { getToken } = useAuth();

  const { mutate: toggleLike, isPending } = useMutation({
    mutationFn: async ({ sessionId, isLiked }: LikeMutationParams) => {
      const token = await getToken();
      const action = isLiked ? 'unlike' : 'like';

      const res = await fetch('/api/engagement/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
