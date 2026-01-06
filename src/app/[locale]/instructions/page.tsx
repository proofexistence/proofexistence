'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Wallet,
  PenTool,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';

export default function InstructionsPage() {
  return (
    <div className="relative w-full min-h-screen text-white overflow-hidden selection:bg-purple-500/30 font-sans">
      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-cyan-900/10 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 container mx-auto px-6 pt-48 pb-24 max-w-4xl">
        <PageHeader
          title="How it Works"
          description="Your guide to proving existence on the blockchain."
          align="center"
          className="mb-16"
        />

        <div className="space-y-12">
          {/* Step 1: Connect Wallet */}
          <section className="group relative bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
            <div className="absolute -top-6 -left-6 w-12 h-12 bg-black border border-white/20 rounded-full flex items-center justify-center text-xl font-bold text-zinc-400 shadow-xl group-hover:border-purple-500/50 group-hover:text-purple-400 transition-colors">
              1
            </div>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="p-4 bg-purple-500/10 rounded-xl">
                <Wallet className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-3 text-white">
                  Connect Your Wallet
                </h2>
                <p className="text-zinc-400 leading-relaxed mb-4">
                  To interact with the Proof of Existence protocol, you need a
                  Web3 wallet. We support various connection methods including
                  MetaMask, Coinbase Wallet, and social logins via Web3Auth.
                </p>
                <div className="p-4 bg-black/30 rounded-lg border border-white/5 text-sm text-zinc-500">
                  <span className="text-purple-400 font-semibold">Note:</span>{' '}
                  We are currently operating on the
                  <span className="text-white mx-1">Polygon Amoy Testnet</span>.
                </div>
              </div>
            </div>
          </section>

          {/* Step 2: Get Test Tokens */}
          <section className="group relative bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
            <div className="absolute -top-6 -left-6 w-12 h-12 bg-black border border-white/20 rounded-full flex items-center justify-center text-xl font-bold text-zinc-400 shadow-xl group-hover:border-pink-500/50 group-hover:text-pink-400 transition-colors">
              2
            </div>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="p-4 bg-pink-500/10 rounded-xl">
                <HelpCircle className="w-8 h-8 text-pink-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-3 text-white">
                  Get Test Tokens
                </h2>
                <p className="text-zinc-400 leading-relaxed mb-6">
                  You need <span className="text-white">Testnet MATIC</span> to
                  pay for gas fees. You can get them for free from the faucet.
                </p>

                <Link
                  href="https://faucet.stakepool.dev.br/amoy"
                  target="_blank"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-semibold shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Go to Amoy Faucet
                  <ExternalLink className="w-4 h-4" />
                </Link>

                <p className="mt-4 text-xs text-zinc-500">
                  Select &quot;Polygon Amoy&quot; network and enter your wallet
                  address.
                </p>
              </div>
            </div>
          </section>

          {/* Step 3: Draw and Mint */}
          <section className="group relative bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
            <div className="absolute -top-6 -left-6 w-12 h-12 bg-black border border-white/20 rounded-full flex items-center justify-center text-xl font-bold text-zinc-400 shadow-xl group-hover:border-cyan-500/50 group-hover:text-cyan-400 transition-colors">
              3
            </div>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="p-4 bg-cyan-500/10 rounded-xl">
                <PenTool className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-3 text-white">
                  Draw & Mint
                </h2>
                <p className="text-zinc-400 leading-relaxed mb-4">
                  Visit the canvas, create your unique trace, and mint it as an
                  NFT. This act records your existence on the blockchain
                  forever.
                </p>
                <Link
                  href="/canvas"
                  className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors font-medium group/link"
                >
                  Start Drawing
                  <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-24 text-center pb-12">
          <p className="text-zinc-600 text-sm">
            Proof of Existence 2026. Built on Polygon Amoy.
          </p>
        </footer>
      </div>
    </div>
  );
}
