'use client';

import { Sparkles, Zap } from 'lucide-react';

interface GasFreeBadgeProps {
  variant?: 'default' | 'compact' | 'pill';
  className?: string;
}

/**
 * Badge indicating free gas for gasless minting
 */
export function GasFreeBadge({
  variant = 'default',
  className = '',
}: GasFreeBadgeProps) {
  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-medium text-green-400 ${className}`}
      >
        <Zap className="h-3 w-3" />
        Free
      </span>
    );
  }

  if (variant === 'pill') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-green-500/20 border border-green-500/30 px-2 py-0.5 text-xs font-medium text-green-400 ${className}`}
      >
        <Sparkles className="h-3 w-3" />
        Free gas
      </span>
    );
  }

  // Default variant
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-green-500/10 px-1.5 py-0.5 text-xs font-medium text-green-400 ${className}`}
    >
      <Sparkles className="h-3 w-3" />
      Free gas
    </span>
  );
}

/**
 * Tooltip content explaining gasless minting
 */
export function GaslessTooltipContent() {
  return (
    <div className="max-w-xs space-y-2 p-1">
      <p className="font-medium text-white">Gasless Minting</p>
      <p className="text-sm text-zinc-400">
        Use your unclaimed TIME26 rewards to mint without paying gas fees.
        The cost includes both the mint fee and gas equivalent in TIME26.
      </p>
      <p className="text-xs text-zinc-500">
        Your TIME26 balance will be burned to cover the transaction.
      </p>
    </div>
  );
}
