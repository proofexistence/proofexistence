'use client';

import { useTime26Balance } from '@/hooks/useTime26Balance';
import { cn } from '@/lib/utils';

interface Time26BalanceProps {
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

export function Time26Balance({
  className,
  showIcon = true,
  compact = false,
}: Time26BalanceProps) {
  const { balance, isLoading } = useTime26Balance();

  if (isLoading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-4 w-16 rounded bg-white/10" />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {showIcon && <Time26Icon className="h-4 w-4" />}
      <span className={cn('font-mono', compact ? 'text-sm' : 'text-base')}>
        {parseFloat(balance).toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}
      </span>
      {!compact && (
        <span className="text-xs text-white/50 uppercase">TIME26</span>
      )}
    </div>
  );
}

function Time26Icon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="1.5"
        className="opacity-50"
      />
      <path
        d="M12 6v6l4 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
