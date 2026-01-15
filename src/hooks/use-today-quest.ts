import { useQuery } from '@tanstack/react-query';
import { useWeb3Auth } from '@/lib/web3auth';

interface TodayTheme {
  name: string;
  description?: string;
}

interface DailyTask {
  target?: number;
  current?: number;
  reward: string;
  completed: boolean;
  sessionId?: string | null;
}

interface TodayQuestData {
  date: string;
  theme: TodayTheme | null;
  tasks: {
    dailyCreate: DailyTask;
    dailyLike: DailyTask;
    dailyTheme: DailyTask;
  } | null;
  streak: {
    current: number;
    todayClaimed: boolean;
    dailyReward: string;
    nextMilestone: {
      day: number;
      reward: string;
      badgeId: string;
    } | null;
  } | null;
  totalEarned: string;
}

/**
 * Hook to fetch today's quest data including theme and tasks
 * - Theme is always fetched (public info)
 * - Tasks and streak require authentication
 */
export function useTodayQuest() {
  const { user: web3User } = useWeb3Auth();

  return useQuery<TodayQuestData>({
    queryKey: ['quests', 'today', web3User?.walletAddress ?? 'public'],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (web3User?.walletAddress) {
        headers['X-Wallet-Address'] = web3User.walletAddress;
      }
      const res = await fetch('/api/quests/today', { headers });
      if (!res.ok) throw new Error('Failed to fetch quests');
      return res.json();
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to fetch only today's theme (public info, no auth required)
 * Use this when you only need the theme without user-specific task data
 */
export function useTodayTheme() {
  return useQuery<{ theme: TodayTheme | null }>({
    queryKey: ['quests', 'today', 'theme-only'],
    queryFn: async () => {
      const res = await fetch('/api/quests/today');
      if (!res.ok) throw new Error('Failed to fetch theme');
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes (theme doesn't change often)
  });
}
