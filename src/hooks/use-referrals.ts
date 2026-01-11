import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/hooks/use-profile';

export function useReferrals() {
  const { profile } = useProfile();

  return useQuery({
    queryKey: ['referrals', profile?.clerkId],
    queryFn: async () => {
      const res = await fetch('/api/user/referrals');
      if (!res.ok) {
        throw new Error('Failed to fetch referrals');
      }
      return res.json() as Promise<{ count: number }>;
    },
    enabled: !!profile,
    retry: false,
  });
}
