'use client';

import { useState } from 'react';
import { GalleryGrid } from '@/components/gallery/gallery-grid';
import { BadgeDisplay } from '@/components/dashboard/badge-display';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeb3Auth } from '@/lib/web3auth';

import Image from 'next/image';

// Types (should ideally be imported from shared location but defining here for speed)
type ProfileUser = {
  id: string;
  clerkId: string | null; // nullable for Web3Auth users
  name: string | null;
  walletAddress: string;
  avatarUrl: string | null;
  createdAt: Date;
};

type ProofItem = {
  id: string;
  createdAt: Date;
  status: string; // 'PENDING' | 'MINTED' | 'SETTLED' | 'FAILED'
  ipfsHash: string | null;
  title?: string | null;
  message?: string | null;
  views?: number | null;
  likes?: number | null;
  userName?: string | null;
  walletAddress?: string | null;
  previewUrl?: string | null;
  hidden?: number;
};

type BadgeItem = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  awardedAt: Date | null;
};

interface ProfileViewProps {
  user: ProfileUser;
  createdProofs: ProofItem[];
  savedProofs: ProofItem[];
  badges: BadgeItem[];
  onVisibilityChange?: () => void;
}

export function ProfileView({
  user,
  createdProofs,
  savedProofs,
  badges,
  onVisibilityChange,
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'created' | 'saved' | 'badges'>(
    'created'
  );

  // Calculate stats
  const totalCreated = createdProofs.length;
  // const totalLikesReceived = createdProofs.reduce((acc, curr) => acc + (curr.likes || 0), 0);
  const totalBadges = badges.length;

  // Format proofs for GalleryGrid (ensure types match)
  const formatProofs = (proofs: ProofItem[]) =>
    proofs.map((p) => ({
      id: p.id,
      createdAt: new Date(p.createdAt).toISOString(),
      status: p.status,
      ipfsHash: p.ipfsHash,
      title: p.title,
      message: p.message,
      views: p.views || 0,
      likes: p.likes || 0,
      previewUrl: p.previewUrl,
      hidden: p.hidden || 0,
      userName: p.userName || user.name, // Fallback to profile user if null
      walletAddress: p.walletAddress || user.walletAddress,
    }));

  const { user: currentUser } = useWeb3Auth();

  // Check if the current logged-in user is the owner of this profile
  const isOwner =
    currentUser?.walletAddress?.toLowerCase() ===
    user.walletAddress.toLowerCase();

  // Use avatarUrl from database
  const profileImageUrl = user.avatarUrl;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-12">
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-blue-500 p-1 mb-6 shadow-[0_0_40px_rgba(168,85,247,0.4)]">
          <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden relative">
            {profileImageUrl ? (
              <Image
                src={profileImageUrl}
                alt={user.name || 'Profile'}
                fill
                sizes="128px"
                className="object-cover"
              />
            ) : (
              <span className="text-4xl">👤</span>
            )}
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">
          {user.name || 'Anonymous'}
        </h1>
        <p className="text-zinc-500 font-mono text-sm mb-6 bg-zinc-900 px-3 py-1 rounded-full border border-white/10">
          {user.walletAddress}
        </p>

        <div className="flex gap-8 text-sm">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">
              {totalCreated}
            </span>
            <span className="text-zinc-500 uppercase tracking-widest text-xs">
              Created
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white">{totalBadges}</span>
            <span className="text-zinc-500 uppercase tracking-widest text-xs">
              Badges
            </span>
          </div>
          {/* <div className="flex flex-col">
                    <span className="text-2xl font-bold text-white">{totalLikesReceived}</span>
                    <span className="text-zinc-500 uppercase tracking-widest text-xs">Likes</span>
                </div> */}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center border-b border-white/10 mb-8">
        <button
          onClick={() => setActiveTab('created')}
          className={`px-8 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'created' ? 'border-purple-500 text-white' : 'border-transparent text-zinc-500 hover:text-white'}`}
        >
          Created
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-8 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'saved' ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-white'}`}
        >
          Collection
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`px-8 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'badges' ? 'border-yellow-500 text-white' : 'border-transparent text-zinc-500 hover:text-white'}`}
        >
          Achievements
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'created' && (
            <GalleryGrid
              proofs={formatProofs(createdProofs)}
              isOwner={isOwner}
              onVisibilityChange={onVisibilityChange}
            />
          )}
          {activeTab === 'saved' && (
            <GalleryGrid proofs={formatProofs(savedProofs)} isOwner={false} />
          )}
          {activeTab === 'badges' && <BadgeDisplay badgesList={badges} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
