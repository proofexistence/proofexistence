'use client';

import { useEffect, useState } from 'react';
import { getTimeUntilLaunch } from '@/lib/launch-config';
import { motion } from 'framer-motion';

export function LaunchCountdown({ onFinished }: { onFinished: () => void }) {
  const [timeLeft, setTimeLeft] = useState<ReturnType<
    typeof getTimeUntilLaunch
  > | null>(null);

  useEffect(() => {
    // Initial calculation on client only to avoid hydration mismatch
    const initial = getTimeUntilLaunch();
    if (initial.finished) {
      onFinished();
      return;
    }
    setTimeLeft(initial);

    const timer = setInterval(() => {
      const remaining = getTimeUntilLaunch();
      setTimeLeft(remaining);
      if (remaining.finished) {
        clearInterval(timer);
        onFinished();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onFinished]);

  // Show nothing during SSR to avoid hydration mismatch
  if (!timeLeft || timeLeft.finished) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-900/10 blur-[100px] rounded-full animate-pulse delay-75" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h1 className="text-4xl md:text-6xl font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-400 to-zinc-600">
            POE 2026
          </h1>
          <p className="text-zinc-500 font-mono text-sm tracking-[0.2em] uppercase">
            Proof of Existence Launching In
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <TimeUnit value={timeLeft.days} label="Days" />
          <TimeUnit value={timeLeft.hours} label="Hours" />
          <TimeUnit value={timeLeft.minutes} label="Minutes" />
          <TimeUnit value={timeLeft.seconds} label="Seconds" />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-xs text-zinc-600 font-bold tracking-widest"
        >
          COSMOS AWAKENS AT UTC 00:00
        </motion.p>

        <motion.a
          href="https://staging.proofexistence.com"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-4 text-sm font-mono text-zinc-500 hover:text-white transition-colors border-b border-transparent hover:border-white/50"
        >
          Play around on Beta: staging.proofexistence.com
        </motion.a>
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <span className="text-5xl md:text-8xl font-black font-mono tracking-tighter tabular-nums bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-600">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs md:text-sm font-bold tracking-widest text-zinc-500 uppercase">
        {label}
      </span>
    </div>
  );
}
