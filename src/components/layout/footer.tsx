'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Heart, Wallet } from 'lucide-react';

const WALLETS = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0xA7D2A0647F1f12455f543Db4CaA350e85C0Eae09',
    color: 'from-blue-400 to-indigo-500',
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    address: 'bc1qqzdd7fjll2vuujp3pglxmnkj66cf3rsxu3jhsx',
    color: 'from-orange-400 to-amber-500',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    address: '3EAHVpuY7MYAUrZoWfy2MGLmHZDpwYNZB6MYmATny6QN',
    color: 'from-purple-400 to-fuchsia-500',
  },
];

export function Footer() {
  const pathname = usePathname();
  const [copied, setCopied] = useState<string | null>(null);

  // Hide footer on specific routes
  if (
    pathname === '/cosmos' ||
    pathname === '/canvas' ||
    pathname?.startsWith('/proof')
  ) {
    return null;
  }

  const handleCopy = (address: string, symbol: string) => {
    navigator.clipboard.writeText(address);
    setCopied(symbol);
    setTimeout(() => setCopied(null), 2000);
  };

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

          {/* Wallets Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Wallet className="w-4 h-4 text-zinc-400" />
              <h4 className="text-sm font-semibold text-zinc-200">
                Sponsor a Stranger On-Chain
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {WALLETS.map((wallet) => (
                <button
                  key={wallet.symbol}
                  onClick={() => handleCopy(wallet.address, wallet.symbol)}
                  className="group relative flex flex-col gap-2 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 text-left"
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold bg-clip-text text-transparent bg-gradient-to-r ${wallet.color}`}
                    >
                      {wallet.name}
                    </span>
                    <div className="text-zinc-500 group-hover:text-white transition-colors">
                      <AnimatePresence mode="wait">
                        {copied === wallet.symbol ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="copy"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="font-mono text-[10px] text-zinc-500 truncate w-full group-hover:text-zinc-400 transition-colors">
                    {wallet.address}
                  </div>

                  {/* Tooltip feedback for copy */}
                  <AnimatePresence>
                    {copied === wallet.symbol && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute inset-x-0 -top-8 flex justify-center pointer-events-none"
                      >
                        <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-200 text-[10px] font-medium border border-zinc-700 shadow-xl">
                          Address Copied
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              ))}
            </div>
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
    </footer>
  );
}
