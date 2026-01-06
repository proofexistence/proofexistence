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
  Link2,
} from 'lucide-react';
import { NFTThumbnail } from './nft-thumbnail';
import { useState, useRef, useEffect } from 'react';
import { useProfile } from '@/hooks/use-profile';
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
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated } = useProfile();

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(event.target as Node)
      ) {
        setShowShareMenu(false);
      }
    };
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShareMenu]);
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

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/proof/${id}`;
  const displayTitle = title || `Proof #${shortId}`;
  const shareText = `Check out this proof of existence: "${displayTitle}" on POE 2026`;

  const handleShare = async (
    e: React.MouseEvent,
    mode: 'toggle' | 'copy' | 'twitter' | 'threads' | 'instagram' = 'toggle'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (mode === 'toggle') {
      setShowShareMenu(!showShareMenu);
      return;
    }

    setShowShareMenu(false);

    switch (mode) {
      case 'copy':
        await navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        break;
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
          '_blank',
          'noopener,noreferrer'
        );
        break;
      case 'threads':
        window.open(
          `https://www.threads.net/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
          '_blank',
          'noopener,noreferrer'
        );
        break;
      case 'instagram':
        await navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        window.open('https://instagram.com', '_blank', 'noopener,noreferrer');
        break;
    }
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
      className={`group relative flex flex-col aspect-[4/5] rounded-2xl bg-zinc-900/20 border overflow-hidden transition-colors ${
        isHidden
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
        <div ref={shareMenuRef} className="relative">
          <button
            onClick={(e) => handleShare(e, 'toggle')}
            className="flex items-center justify-center w-8 h-8 -mr-1 text-zinc-500 hover:text-white transition-colors"
            title="Share"
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>

          {showShareMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-44 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-in zoom-in-95 fade-in duration-200">
              <button
                onClick={(e) => handleShare(e, 'copy')}
                className="w-full text-left px-3 py-2.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2.5"
              >
                <Link2 className="w-3.5 h-3.5" />
                Copy Link
              </button>
              <div className="h-px bg-white/10" />
              <button
                onClick={(e) => handleShare(e, 'twitter')}
                className="w-full text-left px-3 py-2.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2.5"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Post on X
              </button>
              <div className="h-px bg-white/10" />
              <button
                onClick={(e) => handleShare(e, 'threads')}
                className="w-full text-left px-3 py-2.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2.5"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.068V12c.012-3.574.89-6.466 2.628-8.605C5.9 1.302 8.55.12 12.021.12c3.417 0 6.03 1.181 7.789 3.516 1.63 2.166 2.475 5.053 2.524 8.595l.001.024c-.049 3.542-.894 6.429-2.524 8.595-1.76 2.335-4.373 3.516-7.79 3.516l-.835-.366zm-.165-2.002c2.688 0 4.736-.879 6.089-2.614 1.261-1.619 1.929-3.974 1.977-6.999v-.003c-.048-3.032-.716-5.387-1.977-7.006C16.757 3.641 14.709 2.762 12.021 2.762c-2.719 0-4.785.881-6.145 2.618-1.261 1.612-1.929 3.962-1.977 6.988v.018c.048 3.012.716 5.358 1.977 6.969 1.36 1.737 3.426 2.618 6.145 2.618v.025zM8.08 15.879c-.24 0-.48-.088-.662-.264-.372-.36-.383-.956-.022-1.328l5.5-5.665c.361-.371.957-.382 1.328-.022.372.361.383.956.022 1.328l-5.5 5.665c-.184.19-.43.286-.666.286zm7.14.001c-.236 0-.471-.094-.647-.282l-5.5-5.883c-.35-.374-.33-.97.044-1.32.374-.35.97-.33 1.32.045l5.5 5.882c.35.374.33.97-.044 1.32-.18.168-.41.252-.64.252l-.033-.014z" />
                </svg>
                Post on Threads
              </button>
              <div className="h-px bg-white/10" />
              <button
                onClick={(e) => handleShare(e, 'instagram')}
                className="w-full text-left px-3 py-2.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2.5"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                Post on Instagram
              </button>
            </div>
          )}
        </div>

        {/* Visibility Toggle (Owner Only) */}
        {isOwner && (
          <button
            onClick={handleToggleVisibility}
            disabled={isTogglingVisibility}
            className={`flex items-center justify-center w-8 h-8 -mr-1 transition-colors ${
              isHidden
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
