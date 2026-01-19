'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { usePathname } from '@/i18n/navigation';

const STORAGE_KEY = 'poe-hint-dismissed';

export function DrawToProofHint() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Only show on homepage
    if (pathname !== '/') {
      // Early return for non-homepage paths without setting state
      return;
    }

    // Check if user has dismissed before
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      // Already dismissed, no need to show
      return;
    }

    // Delay showing for smoother UX
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, [pathname]);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 flex flex-col items-center pointer-events-auto"
          onClick={handleDismiss}
        >
          {/* Hand-drawn arrow SVG pointing up */}
          <motion.svg
            width="40"
            height="50"
            viewBox="0 0 40 50"
            fill="none"
            className="text-white/70"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Curved line with hand-drawn feel - reversed */}
            <path
              d="M20 48 C18 42, 22 38, 19 32 C16 26, 24 22, 20 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="2 1"
              style={{
                filter: 'url(#hand-drawn-filter)',
              }}
            />
            {/* Arrow head pointing up */}
            <path
              d="M12 22 L20 14 L28 22"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Hand-drawn filter for wobbly effect */}
            <defs>
              <filter id="hand-drawn-filter">
                <feTurbulence
                  type="turbulence"
                  baseFrequency="0.05"
                  numOctaves="2"
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale="1"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </motion.svg>

          {/* Start Here text */}
          <motion.div
            className="relative"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-sm font-medium text-white tracking-wide whitespace-nowrap">
              Start Here
            </span>
          </motion.div>

          {/* Tap to dismiss hint */}
          <motion.span
            className="mt-2 text-[10px] text-zinc-500 whitespace-nowrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            tap to dismiss
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
