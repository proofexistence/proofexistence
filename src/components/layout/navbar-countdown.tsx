'use client';

import { useEffect, useState } from 'react';
import { getTimeUntilEnd } from '@/lib/launch-config';

export function NavbarCountdown() {
  const [timeLeft, setTimeLeft] = useState<ReturnType<
    typeof getTimeUntilEnd
  > | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const remaining = getTimeUntilEnd();
      setTimeLeft(remaining);
      if (remaining.finished) {
        clearInterval(timer);
      }
    };

    const initialTimeout = setTimeout(updateTime, 0);
    const timer = setInterval(updateTime, 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(timer);
    };
  }, []);

  if (!timeLeft || timeLeft.finished) return null;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
        2026 Ends
      </span>
      <div className="flex items-center gap-0.5 font-mono text-xs text-zinc-300 tabular-nums">
        <span>{timeLeft.days}d</span>
        <span className="text-zinc-600">:</span>
        <span>{pad(timeLeft.hours)}h</span>
        <span className="text-zinc-600">:</span>
        <span>{pad(timeLeft.minutes)}m</span>
        <span className="text-zinc-600">:</span>
        <span>{pad(timeLeft.seconds)}s</span>
      </div>
    </div>
  );
}
