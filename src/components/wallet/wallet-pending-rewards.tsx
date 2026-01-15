'use client';

import { useState } from 'react';
import { Gift, Loader2, Check } from 'lucide-react';
import { useTime26Balance } from '@/hooks/useTime26Balance';
import { useClaimTime26 } from '@/hooks/useClaimTime26';

export function WalletPendingRewards() {
  const { isLoading, stats, refresh } = useTime26Balance();
  const {
    claimable,
    claimableFormatted,
    isClaiming,
    claimRewards,
    claimError,
  } = useClaimTime26();
  const [claimSuccess, setClaimSuccess] = useState(false);

  const handleClaim = async () => {
    const success = await claimRewards();
    if (success) {
      setClaimSuccess(true);
      refresh();
      setTimeout(() => setClaimSuccess(false), 3000);
    }
  };

  // Parse claimable amount
  const claimableAmount = parseFloat(claimableFormatted) || 0;

  // Only show if there's something to claim or just claimed successfully
  if (!claimable && !claimSuccess && claimableAmount <= 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-b border-white/10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            TIME26 Rewards
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
              {claimableAmount.toFixed(2)} T26
            </span>
            {claimSuccess ? (
              <span className="px-2.5 py-1 text-[10px] font-semibold bg-green-500/20 text-green-400 rounded-lg flex items-center gap-1">
                <Check className="w-3 h-3" />
                Claimed!
              </span>
            ) : claimable ? (
              <button
                onClick={handleClaim}
                disabled={isClaiming}
                className="px-2.5 py-1 text-[10px] font-semibold bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white rounded-lg transition-colors flex items-center gap-1"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  'Claim'
                )}
              </button>
            ) : null}
          </div>

          {/* Error */}
          {claimError && (
            <div className="text-[10px] text-red-400 truncate">
              {claimError}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="text-[10px] text-zinc-500">
              {stats.daysActive} days active
            </div>
          )}
        </div>
      )}
    </div>
  );
}
