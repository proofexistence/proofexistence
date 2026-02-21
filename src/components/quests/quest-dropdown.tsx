'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTodayQuest } from '@/hooks/use-today-quest';
import { Target, Pencil, Check, Sparkles, Heart, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Reuse shared hook (deduplicates with navbar's useTodayQuest)
  const { data, isLoading } = useTodayQuest();

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

  const tasks = data?.tasks;
  const streak = data?.streak;

  // Count incomplete tasks
  const incompleteCount =
    tasks && streak
      ? [
          !tasks.dailyCreate.completed,
          !tasks.dailyLike.completed,
          !tasks.dailyTheme.completed,
          !streak.todayClaimed,
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
          ) : tasks && streak ? (
            <div className="divide-y divide-white/10">
              {/* Tasks */}
              <div className="p-3 space-y-2">
                <TaskItem
                  icon={<Sparkles className="w-4 h-4" />}
                  label={t('tasks.dailyCreate', {
                    current: tasks!.dailyCreate.current ?? 0,
                    target: tasks!.dailyCreate.target ?? 1,
                  })}
                  reward={tasks!.dailyCreate.reward}
                  completed={tasks!.dailyCreate.completed}
                />
                <TaskItem
                  icon={<Heart className="w-4 h-4" />}
                  label={t('tasks.dailyLike', {
                    current: tasks!.dailyLike.current ?? 0,
                    target: tasks!.dailyLike.target ?? 3,
                  })}
                  reward={tasks!.dailyLike.reward}
                  completed={tasks!.dailyLike.completed}
                />
                <ThemeTaskItem
                  theme={data?.theme ?? null}
                  reward={tasks!.dailyTheme.reward}
                  completed={tasks!.dailyTheme.completed}
                />
              </div>

              {/* Streak */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">
                      {t('streak.days', { count: streak!.current })}
                    </span>
                  </div>
                  {!streak!.todayClaimed && (
                    <button
                      onClick={() => claimStreakMutation.mutate()}
                      disabled={claimStreakMutation.isPending}
                      className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                    >
                      {claimStreakMutation.isPending
                        ? '...'
                        : t('streak.claim', {
                            amount: streak!.dailyReward,
                          })}
                    </button>
                  )}
                  {streak!.todayClaimed && (
                    <Check className="w-4 h-4 text-green-400" />
                  )}
                </div>
                {streak!.nextMilestone && (
                  <div className="text-xs text-zinc-500">
                    {t('streak.nextMilestone', {
                      day: streak!.nextMilestone.day,
                    })}
                    {' → '}
                    <span className="text-amber-400">
                      +{streak!.nextMilestone.reward}
                    </span>
                  </div>
                )}
              </div>

              {/* Total Earned */}
              {data && parseInt(data.totalEarned) > 0 && (
                <div className="p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">
                      {t('rewards.available')}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {data.totalEarned} TIME26
                    </span>
                  </div>
                </div>
              )}
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

function ThemeTaskItem({
  theme,
  reward,
  completed,
}: {
  theme: { name: string; description?: string } | null;
  reward: string;
  completed: boolean;
}) {
  const t = useTranslations('quests');

  if (!theme) {
    return (
      <TaskItem
        icon={<Palette className="w-4 h-4" />}
        label={t('tasks.dailyTheme')}
        reward={reward}
        completed={completed}
      />
    );
  }

  // Try to get translation, fallback to original value
  const themeKey = theme.name.toLowerCase().replace(/\s+/g, '_');
  const nameKey = `themes.${themeKey}`;
  const descKey = `themes.${themeKey}_desc`;

  // Use raw() to check if translation exists, fallback to original
  let translatedName: string;
  let translatedDesc: string | null | undefined;

  try {
    const rawName = t.raw(nameKey);
    translatedName = typeof rawName === 'string' ? rawName : theme.name;
  } catch {
    translatedName = theme.name;
  }

  try {
    const rawDesc = t.raw(descKey);
    translatedDesc = typeof rawDesc === 'string' ? rawDesc : theme.description;
  } catch {
    translatedDesc = theme.description;
  }

  return (
    <div
      className={cn(
        'p-2 rounded-lg',
        completed
          ? 'bg-green-500/10'
          : 'bg-gradient-to-r from-purple-500/10 to-blue-500/10'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={completed ? 'text-green-400' : 'text-purple-400'}>
            {completed ? (
              <Check className="w-4 h-4" />
            ) : (
              <Palette className="w-4 h-4" />
            )}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
            {t('todayTheme')}
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
      <div className="ml-6">
        <span
          className={cn(
            'text-sm font-medium',
            completed ? 'text-green-300 line-through' : 'text-white'
          )}
        >
          {translatedName}
        </span>
        {translatedDesc && (
          <p
            className={cn(
              'text-xs mt-0.5',
              completed ? 'text-green-400/60' : 'text-zinc-500'
            )}
          >
            {translatedDesc}
          </p>
        )}
      </div>
    </div>
  );
}
