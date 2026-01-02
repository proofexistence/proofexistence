'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type SessionStatus } from '@/db/schema';
import {

  Check,
  BarChart2,
  Heart,
  Bookmark,
  Share2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { NFTThumbnail } from './nft-thumbnail';
import { useState } from 'react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useSavedProofs } from '@/hooks/use-saved-proofs';
import { useLikes } from '@/hooks/use-likes';
import { useWeb3Auth } from '@/lib/web3auth';

interface ProofCardProps {
  id: string;
  createdAt: Date;
  status: SessionStatus;
  ipfsHash: string | null;
  title?: string | null;
  message?: string | null;
  views?: number;
  likes?: number;
  userName?: string | null;
  walletAddress?: string | null;
  isOwner?: boolean;
  previewUrl?: string | null;
  hidden?: number;
  onVisibilityChange?: () => void;
}

export function ProofCard({
  id,
  createdAt,
  status,
  ipfsHash,
  previewUrl,
  title,
  message,
  views = 0,
  likes = 0,
  userName,
  walletAddress,
  isOwner,
  hidden = 0,
  onVisibilityChange,
}: ProofCardProps) {
  const router = useRouter();
  const shortId = id.slice(0, 8);
  const dateStr = new Date(createdAt).toLocaleDateString();
  const displayName =
    userName ||
    (walletAddress ? `${walletAddress.slice(0, 6)}...` : 'Anonymous');

  // Profile URL - use wallet address as identifier
  const profileUrl = walletAddress ? `/u/${walletAddress}` : null;

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (profileUrl) {
      router.push(profileUrl);
    }
  };

  // Local state for interactions (optimistic UI)
  const [likeCount, setLikeCount] = useState(likes);
  const [isLiked, setIsLiked] = useState(false); // separate API call needed to check if user liked? For now default false.

  // React Query Hook for Saved State
  const { savedIds, toggleSave } = useSavedProofs();
  const isSaved = savedIds.has(id);

  // Share State
  const [isCopied, setIsCopied] = useState(false);

  const { isAuthenticated } = useUserProfile();
  const { login, user } = useWeb3Auth();
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  // React Query Hook for Likes
  const { toggleLike } = useLikes();

  const handleToggleVisibility = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user?.walletAddress || isTogglingVisibility) return;

    setIsTogglingVisibility(true);
    try {
      const res = await fetch(`/api/sessions/${id}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': user.walletAddress,
        },
        body: JSON.stringify({ hidden: hidden === 0 }),
      });

      if (res.ok) {
        onVisibilityChange?.();
      }
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      login();
      return;
    }

    // Optimistic Update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount((prev) => (newIsLiked ? prev + 1 : prev - 1));

    toggleLike(
      { sessionId: id, isLiked },
      {
        onError: () => {
          // Revert on error
          setIsLiked(!newIsLiked);
          setLikeCount((prev) => (newIsLiked ? prev - 1 : prev + 1));
        },
      }
    );
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      login();
      return;
    }
    toggleSave({ sessionId: id, isSaved });
  };

  // Check if this proof is hidden
  const isHidden = hidden === 1;

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = `${window.location.origin}/proof/${id}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Status Badge Logic
  const renderStatusBadge = () => {
    if (isOwner) {
      // Owner sees detailed status
      let badgeStyle = 'border-gray-500/30 bg-gray-500/10 text-gray-300';
      if (status === 'PENDING')
        badgeStyle =
          'border-yellow-500/30 bg-yellow-500/10 text-yellow-300 animate-pulse';
      if (status === 'SETTLED')
        badgeStyle = 'border-blue-500/30 bg-blue-500/10 text-blue-300';
      if (status === 'MINTED')
        badgeStyle = 'border-purple-500/30 bg-purple-500/10 text-purple-300';

      return (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeStyle}`}
        >
          {status}
        </span>
      );
    } else {
      // Public sees simplified status but with clear distinction
      let badgeStyle = 'border-gray-500/30 bg-gray-500/10 text-gray-300';
      let statusText: string = status;

      if (status === 'PENDING') {
        badgeStyle =
          'border-yellow-500/30 bg-yellow-500/10 text-yellow-300 animate-pulse';
        statusText = 'PENDING';
      } else if (status === 'SETTLED') {
        badgeStyle = 'border-blue-500/30 bg-blue-500/10 text-blue-300';
        statusText = 'SETTLED';
      } else if (status === 'MINTED') {
        badgeStyle = 'border-purple-500/30 bg-purple-500/10 text-purple-300';
        statusText = 'NFT';
      }

      return (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeStyle}`}
        >
          {statusText}
        </span>
      );
    }
  };

  return (
    <div
      className={`group relative flex flex-col aspect-[4/5] rounded-2xl bg-zinc-900/20 border overflow-hidden transition-colors ${isHidden
          ? 'border-yellow-500/30 opacity-60'
          : 'border-white/5 hover:border-purple-500/50'
        }`}
    >
      {/* Main Content Area (Image + Info) */}
      <Link
        href={`/proof/${id}`}
        className="relative flex-1 w-full overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black to-zinc-900/50" />

        {/* Image / Content */}
        {ipfsHash ? (
          <NFTThumbnail ipfsHash={ipfsHash} alt={`Proof #${shortId}`} />
        ) : previewUrl ? (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`Proof #${shortId}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-purple-500/10 transition-colors">
              <svg
                className="w-8 h-8 text-white/20 group-hover:text-purple-400 transition-colors"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          </div>
        )}

        {/* Overlay Infobadge */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
          <div className="flex justify-between items-start">
            <div>
              <button
                onClick={handleProfileClick}
                className="text-sm font-mono text-white font-bold hover:text-purple-400 transition-colors text-left"
              >
                {displayName}
              </button>
              {title ? (
                <div className="text-sm font-medium text-white/90 line-clamp-1 mt-0.5">
                  {title}
                </div>
              ) : (
                message && (
                  <p className="text-xs text-zinc-300 line-clamp-1 italic opacity-80 mt-0.5">
                    &quot;{message}&quot;
                  </p>
                )
              )}
            </div>
            {renderStatusBadge()}
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="text-xs font-mono text-white/40">#{shortId}</div>
            <span className="text-xs text-white/50">{dateStr}</span>
          </div>
        </div>
      </Link>

      {/* Hidden Badge for Owner */}
      {isOwner && isHidden && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30">
          <EyeOff className="w-3 h-3 text-yellow-400" />
          <span className="text-[10px] font-medium text-yellow-400">
            Hidden
          </span>
        </div>
      )}

      {/* Social Actions Footer */}
      <div className="flex items-center justify-between p-3 bg-white/[0.03] backdrop-blur-md border-t border-white/5 relative z-10">
        {/* View Count */}
        <div className="flex items-center gap-1.5 text-zinc-500 hover:text-purple-400 transition-colors group/action cursor-default">
          <BarChart2 className="w-4 h-4" />
          <span className="text-xs font-medium">{views}</span>
        </div>

        {/* Like */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 transition-colors group/action ${isLiked ? 'text-pink-500' : 'text-zinc-500 hover:text-pink-500'}`}
        >
          <Heart
            className={`w-4 h-4 group-hover/action:scale-110 transition-transform ${isLiked ? 'fill-current' : ''}`}
          />
          <span className="text-xs font-medium">{likeCount}</span>
        </button>

        {/* Bookmark */}
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 transition-colors group/action ${isSaved ? 'text-blue-400' : 'text-zinc-500 hover:text-blue-400'}`}
        >
          <Bookmark
            className={`w-4 h-4 group-hover/action:scale-110 transition-transform ${isSaved ? 'fill-current' : ''}`}
          />
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center justify-center w-8 h-8 -mr-1 text-zinc-500 hover:text-white transition-colors"
          title="Copy Link"
        >
          {isCopied ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
        </button>

        {/* Visibility Toggle (Owner Only) */}
        {isOwner && (
          <button
            onClick={handleToggleVisibility}
            disabled={isTogglingVisibility}
            className={`flex items-center justify-center w-8 h-8 -mr-1 transition-colors ${isHidden
                ? 'text-yellow-400 hover:text-yellow-300'
                : 'text-zinc-500 hover:text-yellow-400'
              } ${isTogglingVisibility ? 'opacity-50' : ''}`}
            title={isHidden ? 'Show in Explore' : 'Hide from Explore'}
          >
            {isHidden ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
