'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Wallet } from 'lucide-react';
import { SponsorModal } from '@/components/sponsor/sponsor-modal';

export function Footer() {
  const pathname = usePathname();
  const [sponsorOpen, setSponsorOpen] = useState(false);

  // Hide footer on specific routes
  if (
    pathname === '/cosmos' ||
    pathname === '/canvas' ||
    pathname?.startsWith('/proof')
  ) {
    return null;
  }

  return (
    <footer className="w-full border-t border-white/5 bg-black/40 backdrop-blur-xl mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              Proof of Existence
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
              Immutable light trails on the blockchain.
              <br />
              Prove you were here.
              <br />
              <span className="opacity-50">Est. 2026</span>
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Link
                href="/supporters"
                className="text-xs font-medium text-zinc-500 hover:text-white transition-colors flex items-center gap-2 group"
              >
                <Heart className="w-3 h-3 group-hover:text-red-500 transition-colors" />
                View Supporters
              </Link>
            </div>
          </div>

          {/* Sponsor Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Wallet className="w-4 h-4 text-zinc-400" />
              <h4 className="text-sm font-semibold text-zinc-200">
                Support the Project
              </h4>
            </div>

            <button
              onClick={() => setSponsorOpen(true)}
              className="group flex items-center gap-3 px-6 py-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
            >
              <Heart className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="font-medium text-zinc-200 group-hover:text-white transition-colors">
                  Sponsor a Stranger
                </span>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Pay for gas-free proofs worldwide
                </p>
              </div>
            </button>

            <p className="text-[10px] text-zinc-600 mt-3 pl-1">
              Your donation sponsors gas-free proofs for strangers worldwide.
              Every contribution helps preserve someone&apos;s digital existence
              forever.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} Proof of Existence. All rights
            reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/brands"
              className="text-xs text-zinc-600 hover:text-white transition-colors"
            >
              Brand Sponsorship
            </Link>
            <Link
              href="/whitepaper"
              className="text-xs text-zinc-600 hover:text-white transition-colors"
            >
              Whitepaper
            </Link>
            <Link
              href="https://github.com/proofexistence"
              target="_blank"
              className="text-xs text-zinc-600 hover:text-white transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="https://x.com/Proofexist2006"
              target="_blank"
              className="text-xs text-zinc-600 hover:text-white transition-colors"
            >
              X (Twitter)
            </Link>
          </div>
        </div>
      </div>

      {/* Sponsor Modal */}
      <SponsorModal open={sponsorOpen} onOpenChange={setSponsorOpen} />
    </footer>
  );
}
