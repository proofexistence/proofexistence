'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function SupportersPage() {
  return (
    <main className="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
      <div className="space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-indigo-300"
          >
            Hall of Fame
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 text-lg max-w-2xl leading-relaxed"
          >
            Proof of Existence is powered by the community. These are the
            believers who help keep the lights on and the canvas open for
            everyone.
          </motion.p>
        </div>

        {/* Supporters List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-6"
        >
          {/* Empty State / CTA */}
          <div className="border border-dashed border-zinc-800 rounded-2xl p-12 text-center bg-zinc-900/30">
            <div className="bg-zinc-900/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">
              Be the First
            </h3>
            <p className="text-zinc-500 max-w-md mx-auto mb-6">
              Support the project and get your name or organization forever
              listed here as an early patron of the arts.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-zinc-400">
              <span>Supported us?</span>
              <Link
                href="https://x.com/Proofexist2006"
                target="_blank"
                className="text-white underline hover:no-underline underline-offset-4 decoration-zinc-700 hover:decoration-white transition-all"
              >
                Message us on X to get listed
              </Link>
            </div>
          </div>

          {/* 
            Example Structure for Future Supporters:
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shimmer" />
                   <span className="font-medium text-zinc-200">Satoshi Nakamoto</span>
                </div>
                <span className="text-xs text-zinc-500 font-mono">Early Patron</span>
              </div>
            </div>
          */}
        </motion.div>
      </div>
    </main>
  );
}
