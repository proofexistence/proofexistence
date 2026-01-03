'use client';

import { Gift, Loader2 } from 'lucide-react';
import { useTime26Balance } from '@/hooks/useTime26Balance';

export function WalletPendingRewards() {
  const { balance, isLoading, stats } = useTime26Balance();

  // Parse balance as number for display
  const pendingAmount = parseFloat(balance) || 0;
  const hasPendingRewards = pendingAmount > 0;

  return (
    <div className="px-4 py-3 border-b border-white/10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Pending Rewards
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading...</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-semibold text-amber-400">
              {pendingAmount.toFixed(2)} T26
            </span>
            {hasPendingRewards && (
              <button
                className="px-2.5 py-1 text-[10px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors cursor-not-allowed opacity-60"
                disabled
                title="Coming soon"
              >
                Claim Soon
              </button>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex items-center gap-3 text-[10px] text-zinc-500">
              <span>Total: {parseFloat(stats.totalEarned).toFixed(2)} T26</span>
              <span>{stats.daysActive} days</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
