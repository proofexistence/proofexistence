'use client';

import { useTime26Balance } from '@/hooks/useTime26Balance';
import { cn } from '@/lib/utils';

interface Time26BalanceCardProps {
  className?: string;
}

export function Time26BalanceCard({ className }: Time26BalanceCardProps) {
  const { balance, stats, recentRewards, isLoading, refresh } =
    useTime26Balance();

  if (isLoading) {
    return (
      <div
        className={cn(
          'animate-pulse rounded-lg border border-white/10 bg-white/5 p-6',
          className
        )}
      >
        <div className="h-8 w-32 rounded bg-white/10" />
        <div className="mt-4 h-4 w-48 rounded bg-white/10" />
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-white/10 bg-white/5 p-6',
        className
      )}
    >
      {/* Balance Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/50">TIME26 Balance</p>
          <p className="mt-1 font-mono text-3xl font-semibold">
            {parseFloat(balance).toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 4,
            })}
          </p>
        </div>
        <button
          onClick={() => refresh()}
          className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
          title="Refresh"
        >
          <RefreshIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
          <div>
            <p className="text-xs text-white/50">Total Earned</p>
            <p className="mt-0.5 font-mono text-sm">
              {parseFloat(stats.totalEarned).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/50">Drawing Time</p>
            <p className="mt-0.5 font-mono text-sm">
              {formatDuration(stats.totalDrawingSeconds)}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/50">Days Active</p>
            <p className="mt-0.5 font-mono text-sm">{stats.daysActive}</p>
          </div>
        </div>
      )}

      {/* Recent Rewards */}
      {recentRewards.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="mb-3 text-sm text-white/70">Recent Rewards</p>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {recentRewards.slice(0, 7).map((reward) => (
              <div
                key={reward.date}
                className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2 text-sm"
              >
                <span className="text-white/70">{reward.date}</span>
                <span className="font-mono">+{reward.earned}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {recentRewards.length === 0 && (
        <div className="mt-6 border-t border-white/10 pt-4 text-center">
          <p className="text-sm text-white/50">
            No rewards yet. Start drawing to earn TIME26!
          </p>
        </div>
      )}
    </div>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 12a9 9 0 11-2.636-6.364M21 12v-6m0 6h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
