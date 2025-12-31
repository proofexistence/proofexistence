'use client';

import Link from 'next/link';
import { AlertTriangle, Github, Book } from 'lucide-react';

export function BetaBanner() {
  return (
    <div className="fixed top-0 left-0 w-full h-8 bg-purple-900/30 backdrop-blur-md border-b border-purple-500/20 z-[100] flex items-center justify-center px-4">
      <div className="flex items-center gap-3 text-[10px] md:text-xs font-mono text-purple-200/80">
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-yellow-500/80" />
          <span className="uppercase tracking-wider font-bold text-purple-100">
            Public Beta
          </span>
        </span>
        <span className="hidden md:inline text-purple-200/40">|</span>
        <span className="hidden md:inline">
          Running on{' '}
          <span className="text-purple-100 font-bold">
            {process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
              ? 'Polygon Amoy'
              : 'Polygon PoS'}
          </span>
          . System matches 2026 Epoch. Features are experimental.
        </span>
        <span className="md:hidden">
          {process.env.NEXT_PUBLIC_IS_TESTNET === 'true' ? 'Testnet' : 'Beta'}{' '}
          Build.
        </span>
        <span className="text-purple-200/40">|</span>
        <Link
          href="https://github.com/proofexistence/proofexistence/issues"
          target="_blank"
          className="flex items-center gap-1 hover:text-white transition-colors group"
        >
          <Github className="w-3 h-3 group-hover:scale-110 transition-transform" />
          <span className="underline decoration-purple-500/30 group-hover:decoration-purple-500/80">
            Report Bugs
          </span>
        </Link>
        <span className="text-purple-200/40">|</span>
        <Link
          href="/instructions"
          className="flex items-center gap-1 hover:text-white transition-colors group"
        >
          <Book className="w-3 h-3 group-hover:scale-110 transition-transform" />
          <span className="underline decoration-purple-500/30 group-hover:decoration-purple-500/80">
            Guide
          </span>
        </Link>
      </div>
    </div>
  );
}
