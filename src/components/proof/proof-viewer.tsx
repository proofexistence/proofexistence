'use client';

import { BLOCK_EXPLORER, isTestnet } from '@/lib/contracts';

import { useRef, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { ReplayCanvasRef } from '@/components/canvas/replay-canvas';
import { TrailPoint } from '@/types/session';
import {
  Camera,
  Pause,
  Play,
  Download,
  X,
  Share2,
  Link2,
  Check,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRecordView } from '@/hooks/use-record-view';

const ReplayCanvas = dynamic(
  () =>
    import('@/components/canvas/replay-canvas').then((mod) => mod.ReplayCanvas),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-transparent" />,
  }
);

interface ProofViewerProps {
  session: {
    id: string;
    startTime: unknown;
    duration: number | null;
    status: unknown;
    trailData: unknown;
    createdAt: unknown;
    txHash: string | null;
    ipfsHash: string | null;
    previewUrl?: string | null;
    color?: string;
    title?: string | null;
    description?: string | null;
    message?: string | null;
    views?: number | null;
    likes?: number | null;
    user?: {
      username: string | null;
      name: string | null;
      walletAddress: string;
      avatarUrl?: string | null;
    } | null;
  };
  nftImage?: string | null;
  isSyncing?: boolean;
}

export function ProofViewer({
  session,
  nftImage,
  isSyncing = false,
}: ProofViewerProps) {
  const router = useRouter();
  const canvasRef = useRef<ReplayCanvasRef>(null);
  const [isSpinning, setIsSpinning] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { recordView } = useRecordView();

  // Share URL for this proof
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/proof/${session.id}`
      : `https://proofexistence.com/proof/${session.id}`;

  // Increment view count on mount
  useEffect(() => {
    recordView(session.id);
  }, [session.id, recordView]);

  // Auto-generate preview if missing
  // Auto-generate preview if missing
  useEffect(() => {
    // If we already have a preview OR if we have an NFT (ipfsHash), do nothing
    if (session.previewUrl || session.ipfsHash) {
      return;
    }

    let attempts = 0;
    const maxAttempts = 20; // Try for 10 seconds (20 * 500ms)

    const checkAndUpload = setInterval(() => {
      attempts++;

      // Check if canvas exists and is ready
      if (canvasRef.current) {
        clearInterval(checkAndUpload);

        // Canvas is mounted. Stabilize view for screenshot.
        // 1. Stop spinning
        setIsSpinning(false);

        // 2. Wait for render cycle, then reset view and capture
        setTimeout(() => {
          if (canvasRef.current) {
            canvasRef.current.resetView(); // Force standard angle
          }

          setTimeout(() => {
            handleScreenshot('upload-only');
            setIsSpinning(true); // Resume spinning
          }, 500); // Small delay after reset to ensure frame is rendered
        }, 2000);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkAndUpload);
        console.warn('[Auto-Preview] Timed out waiting for canvas ref');
      }
    }, 500);

    return () => clearInterval(checkAndUpload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.previewUrl, session.id]);

  const { points: trailData, color: trailColor } = useMemo(() => {
    const raw = session.trailData as
      | { points: TrailPoint[]; color?: string }
      | TrailPoint[];
    if (!raw)
      return { points: [] as TrailPoint[], color: session.color || '#A855F7' };

    if (Array.isArray(raw)) {
      return { points: raw as TrailPoint[], color: session.color || '#A855F7' };
    }

    return {
      points: (raw.points || []) as TrailPoint[],
      color: (raw.color || session.color || '#A855F7') as string,
    };
  }, [session.trailData, session.color]);
  const date = new Date(session.createdAt as string).toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );

  const handleExit = () => {
    // Smart Exit:
    // If we have history AND the referrer is from our own site, go back.
    // Otherwise (direct link, external referrer), go home.
    const isInternalReferrer =
      typeof document !== 'undefined' &&
      document.referrer &&
      document.referrer.includes(window.location.origin);

    if (window.history.length > 1 && isInternalReferrer) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleScreenshot = (
    mode: 'art-only' | 'with-title' | 'upload-only'
  ) => {
    if (!canvasRef.current) return;
    setShowMenu(false);

    // Capture raw canvas (transparent PNG)
    const imgData = canvasRef.current.toDataURL();

    if (mode === 'art-only') {
      downloadImage(imgData, `proof-${session.id}-art.png`);
      return;
    }

    // Composite with Title
    const canvas = document.createElement('canvas');
    // Set HiDPI / 1080p target
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background (Black for contrast)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.src = imgData;
    img.onload = async () => {
      // Draw Art
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Overlay Text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px monospace';
      const titleText = session.title
        ? session.title.toUpperCase()
        : `PROOF #${session.id.slice(0, 8)}`;
      ctx.fillText(titleText, 60, 100);

      ctx.font = '24px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`${date} • ${session.duration}s`, 60, 150);

      const authorDisplay = session.user?.name || session.user?.username;
      if (authorDisplay) {
        ctx.fillText(`By ${authorDisplay}`, 60, 200);
      }

      if (session.txHash) {
        ctx.font = '16px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(`TX: ${session.txHash}`, 60, canvas.height - 60);
      }

      // Referral / Watermark
      const referralCode =
        session.user?.username || session.user?.walletAddress || '';

      // Right-aligned header
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 10;

      // POE 2026 Logo
      ctx.textAlign = 'right';
      ctx.font = 'bold 32px monospace';
      ctx.fillStyle = 'white';
      ctx.fillText('POE 2026', canvas.width - 60, 100);

      // Referral Info
      if (referralCode) {
        ctx.font = '20px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(`REF: ${referralCode}`, canvas.width - 60, 140);
        ctx.fillText('proofexistence.com', canvas.width - 60, 170);
      }

      // Convert to WebP and Upload
      canvas.toBlob(
        async (blob) => {
          if (!blob) return;

          if (mode !== 'upload-only') {
            // 1. Download locally (UX)
            const url = URL.createObjectURL(blob);
            downloadImage(url, `proof-${session.id}-referral.webp`);
            URL.revokeObjectURL(url);
          }

          // 2. Upload to R2 (Auto-save preview)
          // Always upload on regular screenshot, OR if specific update requested
          const formData = new FormData();
          formData.append('file', blob, 'preview.webp');
          formData.append('sessionId', session.id);

          try {
            await fetch('/api/storage/upload', {
              method: 'POST',
              body: formData,
            });
          } catch (e) {
            console.error('Failed to upload preview:', e);
          }
        },
        'image/webp',
        0.9
      );
    };
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  const handleShare = async (
    mode: 'native' | 'copy' | 'twitter' | 'download'
  ) => {
    setShowShareMenu(false);
    const displayTitle = session.title || `Proof #${session.id.slice(0, 8)}`;
    const shareText = `Check out my proof of existence: "${displayTitle}" on POE 2026`;

    switch (mode) {
      case 'native':
        if (navigator.share) {
          try {
            await navigator.share({
              title: displayTitle,
              text: shareText,
              url: shareUrl,
            });
          } catch (err) {
            // User cancelled or error - fall back to copy
            if ((err as Error).name !== 'AbortError') {
              handleShare('copy');
            }
          }
        } else {
          handleShare('copy');
        }
        break;

      case 'copy':
        await navigator.clipboard.writeText(shareUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
        break;

      case 'twitter':
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        break;

      case 'download':
        handleScreenshot('with-title');
        break;
    }
  };

  // Author Display Name
  const authorName =
    session.user?.name || session.user?.username || 'Anonymous';
  const authorHandle = session.user?.username
    ? `@${session.user.username}`
    : session.user?.walletAddress
      ? `${session.user.walletAddress.slice(0, 6)}...`
      : '';
  const authorLink = session.user?.username
    ? `/u/${session.user.username}`
    : null;

  return (
    <div
      className="w-full h-screen relative bg-transparent overflow-hidden flex flex-col"
      onContextMenu={(e) => {
        e.preventDefault();
        handleScreenshot('with-title'); // Right click -> Full Screenshot
      }}
    >
      {/* Header Overlay */}
      <div className="absolute top-8 left-0 w-full p-6 z-10 flex justify-between items-start pointer-events-none">
        <div className="animate-in slide-in-from-top-4 fade-in duration-700 max-w-xl">
          {/* Title & Badge */}
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg font-mono tracking-tight">
              {session.title || `PROOF #${session.id.slice(0, 8)}`}
            </h1>
            <div
              className={`px-3 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md uppercase tracking-wider
                        ${session.status === 'MINTED'
                  ? 'bg-purple-500/20 text-purple-200 border-purple-500/50'
                  : session.status === 'SETTLED'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                    : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                }`}
            >
              {session.status as string}
            </div>
          </div>

          {/* Author */}
          {session.user && (
            <div className="flex items-center gap-3 pointer-events-auto mb-4 group/author">
              {authorLink ? (
                <button
                  onClick={() => router.push(authorLink)}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-[1px]">
                    <div className="relative w-full h-full rounded-full bg-black overflow-hidden flex items-center justify-center">
                      {session.user?.avatarUrl ? (
                        <img
                          src={session.user.avatarUrl}
                          alt={authorName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm">👤</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm leading-none">
                      {authorName}
                    </div>
                    <div className="text-white/50 text-xs font-mono mt-1">
                      {authorHandle}
                    </div>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                    {session.user?.avatarUrl ? (
                      <img
                        src={session.user.avatarUrl}
                        alt={authorName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm">👤</span>
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm leading-none">
                      {authorName}
                    </div>
                    <div className="text-white/50 text-xs font-mono mt-1">
                      {authorHandle}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2 pointer-events-auto">
            <div className="text-white/60 text-sm font-mono flex items-center gap-4">
              <span>{date}</span>
              <span>•</span>
              <span>{session.duration}s Duration</span>
            </div>

            {session.description && (
              <p className="text-white/80 text-sm italic border-l-2 border-white/20 pl-3 py-1 max-w-md">
                {session.description}
              </p>
            )}
            {session.message && (
              <p className="text-purple-200/80 text-xs font-mono mt-2 bg-purple-900/10 inline-block px-2 py-1 rounded border border-purple-500/20">
                &quot;{session.message}&quot;
              </p>
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          <button
            onClick={handleExit}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95 group"
            title="Exit"
          >
            <X size={20} className="text-white/80 group-hover:text-white" />
          </button>
        </div>
      </div>

      {/* Controls Overlay (Bottom Right) */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3 pointer-events-auto animate-in fade-in duration-700 delay-300">
        {/* Spin Toggle */}
        <button
          onClick={() => setIsSpinning(!isSpinning)}
          className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95 group relative"
          title={isSpinning ? 'Pause Rotation' : 'Resume Rotation'}
        >
          {isSpinning ? (
            <Pause size={24} />
          ) : (
            <Play size={24} className="ml-0.5" />
          )}
        </button>

        {/* Share Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowShareMenu(!showShareMenu);
              setShowMenu(false);
            }}
            className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-full shadow-lg shadow-purple-500/30 transition-all hover:scale-105 active:scale-95"
            title="Share"
          >
            {linkCopied ? <Check size={24} /> : <Share2 size={24} />}
          </button>

          {showShareMenu && (
            <div className="absolute bottom-full right-0 mb-3 w-52 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200">
              <button
                onClick={() => handleShare('native')}
                className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
              >
                <Share2 size={16} />
                Share
              </button>
              <div className="h-px bg-white/10" />
              <button
                onClick={() => handleShare('copy')}
                className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
              >
                <Link2 size={16} />
                Copy Link
              </button>
              <div className="h-px bg-white/10" />
              <button
                onClick={() => handleShare('twitter')}
                className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Post on X
              </button>
              <div className="h-px bg-white/10" />
              <button
                onClick={() => handleShare('download')}
                className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
              >
                <Download size={16} />
                Download Image
              </button>
            </div>
          )}
        </div>

        {/* Screenshot Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowMenu(!showMenu);
              setShowShareMenu(false);
            }}
            className="p-3 bg-white text-black hover:bg-zinc-200 rounded-full shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95"
            title="Take Screenshot"
          >
            <Camera size={24} />
          </button>

          {showMenu && (
            <div className="absolute bottom-full right-0 mb-3 w-48 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200">
              <button
                onClick={() => handleScreenshot('art-only')}
                className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <Download size={16} />
                Art Only
              </button>
              <div className="h-px bg-white/10" />
              <button
                onClick={() => handleScreenshot('with-title')}
                className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <Download size={16} />
                With Title
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 w-full h-full">
        <ReplayCanvas
          ref={canvasRef}
          trailData={trailData}
          isSpinning={isSpinning}
          color={trailColor}
        />
      </div>

      {/* Footer / Tx Hash */}
      <div className="absolute bottom-12 left-0 w-full text-center pointer-events-none flex flex-col items-center gap-2">
        {/* Chain Info - Primary for Minted Proofs */}
        {session.txHash && (
          <a
            href={`${BLOCK_EXPLORER}/tx/${session.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200/80 hover:text-purple-200 rounded-full backdrop-blur-md border border-purple-500/20 transition-all font-mono text-xs group"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Verified on Polygon{isTestnet ? ' Amoy' : ''}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-50 group-hover:opacity-100 transition-opacity ml-1"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        )}

        {/* Arweave / Storage Layer */}
        {session.ipfsHash && (
          <div className="pointer-events-auto flex items-center gap-2 mt-1 opacity-60 hover:opacity-100 transition-opacity">
            {isSyncing ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 text-yellow-200/50 rounded-full backdrop-blur-md border border-yellow-500/20 font-mono text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping" />
                <span>Syncing Storage...</span>
              </div>
            ) : (
              <a
                href={
                  nftImage
                    ? nftImage
                    : `https://gateway.irys.xyz/${session.ipfsHash}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/30 hover:bg-black/50 text-white/40 hover:text-white/80 rounded-full backdrop-blur-md border border-white/5 transition-all font-mono text-[10px]"
              >
                <span>{nftImage ? 'Raw Art File' : 'Arweave Metadata'}</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
