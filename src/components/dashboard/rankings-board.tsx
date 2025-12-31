'use client';

import { useState } from 'react';
import { GalleryGrid } from '@/components/gallery/gallery-grid';
import { motion, AnimatePresence } from 'framer-motion';

// Define the shape of data returned by getRankings
type RankingItem = {
  id: string;
  duration: number;
  userId: string | null;
  userName: string | null;
  walletAddress: string | null;
  createdAt: Date;
  status: 'PENDING' | 'MINTED' | 'SETTLED' | 'FAILED'; // Adjust based on DB schema type
  ipfsHash: string | null;
  likes: number | null;
  views: number | null;
  message: string | null;
};

interface RankingsBoardProps {
  topDuration: RankingItem[];
  mostLiked: RankingItem[];
  mostViewed: RankingItem[];
}

export function RankingsBoard({
  topDuration,
  mostLiked,
  mostViewed,
}: RankingsBoardProps) {
  const [activeTab, setActiveTab] = useState<'duration' | 'likes' | 'views'>(
    'likes'
  );

  const tabs = [
    { id: 'likes', label: 'Most Loved', icon: '❤️', data: mostLiked },
    { id: 'views', label: 'Most Viewed', icon: '👀', data: mostViewed },
    {
      id: 'duration',
      label: 'Longest Journeys',
      icon: '⏳',
      data: topDuration,
    },
  ] as const;

  const currentData = tabs.find((t) => t.id === activeTab)?.data || [];

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              relative px-6 py-3 rounded-full text-sm font-medium transition-all duration-300
              ${
                activeTab === tab.id
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105'
                  : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
              }
            `}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <GalleryGrid
            proofs={currentData.map((item) => ({
              id: item.id,
              createdAt: item.createdAt.toISOString(),
              status: item.status,
              ipfsHash: item.ipfsHash,
              message: item.message,
              views: item.views || 0,
              likes: item.likes || 0,
              userName: item.userName,
              walletAddress: item.walletAddress,
            }))}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
