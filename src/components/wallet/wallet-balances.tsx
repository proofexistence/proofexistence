'use client';

import { RefreshCw } from 'lucide-react';
import { useWalletBalances } from '@/hooks/use-wallet-balances';

export function WalletBalances() {
  const { pol, time26, isLoading, error, refresh } = useWalletBalances();

  return (
    <div className="px-4 py-3 border-b border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          Balances
        </span>
        <button
          onClick={refresh}
          disabled={isLoading}
          className={`transition-colors ${
            isLoading ? 'text-green-400' : 'text-zinc-500 hover:text-white'
          }`}
          title="Refresh balances"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className="text-xs text-red-400">Failed to load balances</div>
      ) : (
        <div className="space-y-2">
          {/* POL Balance */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">P</span>
              </div>
              <span className="text-xs text-zinc-400">POL</span>
            </div>
            <span className="text-sm font-mono font-semibold text-white">
              {isLoading ? '-' : pol.formatted}
            </span>
          </div>

          {/* TIME26 Balance */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">T</span>
              </div>
              <span className="text-xs text-zinc-400">TIME26</span>
            </div>
            <span className="text-sm font-mono font-semibold text-white">
              {isLoading ? '-' : time26.formatted}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
