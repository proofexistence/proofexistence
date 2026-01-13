'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Flame, Check, Sparkles, Heart, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestData {
  date: string;
  theme: { name: string; description: string } | null;
  tasks: {
    dailyCreate: {
      target: number;
      current: number;
      reward: string;
      completed: boolean;
    };
    dailyLike: {
      target: number;
      current: number;
      reward: string;
      completed: boolean;
    };
    dailyTheme: {
      reward: string;
      completed: boolean;
      sessionId: string | null;
    };
  };
  streak: {
    current: number;
    todayClaimed: boolean;
    dailyReward: string;
    nextMilestone: {
      day: number;
      reward: string;
      badgeId: string | null;
    } | null;
  };
  totalAvailable: string;
}

export function QuestDropdown({
  walletAddress,
}: {
  walletAddress: string | null;
}) {
  const t = useTranslations('quests');
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data, isLoading } = useQuery<QuestData>({
    queryKey: ['quests', 'today'],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (walletAddress) {
        headers['X-Wallet-Address'] = walletAddress;
      }
      const res = await fetch('/api/quests/today', { headers });
      if (!res.ok) throw new Error('Failed to fetch quests');
      return res.json();
    },
    staleTime: 1000 * 60, // 1 minute
    enabled: isOpen && !!walletAddress,
  });

  const claimStreakMutation = useMutation({
    mutationFn: async () => {
      const headers: Record<string, string> = {};
      if (walletAddress) {
        headers['X-Wallet-Address'] = walletAddress;
      }
      const res = await fetch('/api/quests/claim-streak', {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to claim streak');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests', 'today'] });
    },
  });

  // Count incomplete tasks
  const incompleteCount = data
    ? [
        !data.tasks.dailyCreate.completed,
        !data.tasks.dailyLike.completed,
        !data.tasks.dailyTheme.completed,
        !data.streak.todayClaimed,
      ].filter(Boolean).length
    : 0;

  if (!walletAddress) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
      >
        <Target className="w-4 h-4" />
        {incompleteCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {incompleteCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50">
          {isLoading ? (
            <div className="p-4 text-center text-zinc-500">Loading...</div>
          ) : data ? (
            <div className="divide-y divide-white/10">
              {/* Theme */}
              {data.theme && (
                <div className="p-3">
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                    {t('todayTheme')}
                  </div>
                  <div className="text-sm font-medium text-white">
                    {data.theme.name}
                  </div>
                </div>
              )}

              {/* Tasks */}
              <div className="p-3 space-y-2">
                {/* Daily Create */}
                <TaskItem
                  icon={<Sparkles className="w-4 h-4" />}
                  label={t('tasks.dailyCreate', {
                    current: data.tasks.dailyCreate.current,
                    target: data.tasks.dailyCreate.target,
                  })}
                  reward={data.tasks.dailyCreate.reward}
                  completed={data.tasks.dailyCreate.completed}
                />

                {/* Daily Like */}
                <TaskItem
                  icon={<Heart className="w-4 h-4" />}
                  label={t('tasks.dailyLike', {
                    current: data.tasks.dailyLike.current,
                    target: data.tasks.dailyLike.target,
                  })}
                  reward={data.tasks.dailyLike.reward}
                  completed={data.tasks.dailyLike.completed}
                />

                {/* Daily Theme */}
                <TaskItem
                  icon={<Palette className="w-4 h-4" />}
                  label={t('tasks.dailyTheme')}
                  reward={data.tasks.dailyTheme.reward}
                  completed={data.tasks.dailyTheme.completed}
                />
              </div>

              {/* Streak */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-medium text-white">
                      {t('streak.days', { count: data.streak.current })}
                    </span>
                  </div>
                  {!data.streak.todayClaimed && (
                    <button
                      onClick={() => claimStreakMutation.mutate()}
                      disabled={claimStreakMutation.isPending}
                      className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                    >
                      {claimStreakMutation.isPending
                        ? '...'
                        : `+${data.streak.dailyReward}`}
                    </button>
                  )}
                  {data.streak.todayClaimed && (
                    <Check className="w-4 h-4 text-green-400" />
                  )}
                </div>
                {data.streak.nextMilestone && (
                  <div className="text-xs text-zinc-500">
                    {t('streak.nextMilestone', {
                      day: data.streak.nextMilestone.day,
                    })}
                    {' -> '}
                    <span className="text-amber-400">
                      +{data.streak.nextMilestone.reward}
                    </span>
                  </div>
                )}
              </div>

              {/* Total Available */}
              <div className="p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">
                    {t('rewards.available')}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {data.totalAvailable} TIME26
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TaskItem({
  icon,
  label,
  reward,
  completed,
}: {
  icon: React.ReactNode;
  label: string;
  reward: string;
  completed: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded-lg',
        completed ? 'bg-green-500/10' : 'bg-white/5'
      )}
    >
      <div className="flex items-center gap-2">
        <span className={completed ? 'text-green-400' : 'text-zinc-400'}>
          {completed ? <Check className="w-4 h-4" /> : icon}
        </span>
        <span
          className={cn(
            'text-sm',
            completed ? 'text-green-300 line-through' : 'text-zinc-300'
          )}
        >
          {label}
        </span>
      </div>
      <span
        className={cn(
          'text-xs font-mono',
          completed ? 'text-green-400' : 'text-amber-400'
        )}
      >
        +{reward}
      </span>
    </div>
  );
}
