'use client';

import { useEffect, useState } from 'react';

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
    const targetDate = new Date('2026-01-01T00:00:00Z');

    const updateTimer = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft('00:00:00:00');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const formattedDays = days.toString().padStart(2, '0');
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const formattedSeconds = seconds.toString().padStart(2, '0');

      setTimeLeft(
        `${formattedDays}d ${formattedHours}h ${formattedMinutes}m ${formattedSeconds}s`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-400">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      <span>Count Down 2026:</span>
      <span className="text-white font-bold">{timeLeft}</span>
    </div>
  );
}
