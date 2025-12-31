import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';

interface ProfileData {
  user: {
    username: string | null;
    name: string | null;
    walletAddress: string;
    createdAt: string;
  } | null;
}

export function useProfile() {
  const { user } = useUser();
  const walletAddress = (
    user?.publicMetadata as { walletAddress?: string } | undefined
  )?.walletAddress;

  return useQuery({
    queryKey: ['profile', walletAddress],
    queryFn: async (): Promise<ProfileData> => {
      if (!walletAddress) return { user: null };

      const res = await fetch(`/api/profile/${walletAddress}`);
      if (!res.ok) {
        throw new Error('Failed to fetch profile');
      }
      return res.json();
    },
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
