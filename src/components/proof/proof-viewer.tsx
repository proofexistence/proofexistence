'use client';

import { BLOCK_EXPLORER, isTestnet } from '@/lib/contracts';
import { getArweaveUrl } from '@/lib/arweave-gateway';

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
      : `https://www.proofexistence.com/proof/${session.id}`;

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

  // Format date on client-side only to avoid hydration mismatch (server/client timezone differences)
  const [date, setDate] = useState<string>('');
  useEffect(() => {
    setDate(
      new Date(session.createdAt as string).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }, [session.createdAt]);

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

    // For upload-only mode, just upload the clean canvas without overlay
    if (mode === 'upload-only') {
      // Create a clean canvas with black background + art only
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const img = new Image();
      img.src = imgData;
      img.onload = async () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          async (blob) => {
            if (!blob) return;

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
      return;
    }

    // Composite with Title (for 'with-title' mode)
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

      // Convert to WebP and Download (with-title mode only downloads, doesn't upload)
      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          // Download locally (UX) - no upload for with-title mode
          const url = URL.createObjectURL(blob);
          downloadImage(url, `proof-${session.id}-referral.webp`);
          URL.revokeObjectURL(url);
        },
        'image/webp',
        0.9
      );
    };
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  // Download image: NFT image (if MINTED) → previewUrl → screenshot fallback
  const handleDownload = async () => {
    // 1. If MINTED with ipfsHash, try to get NFT image from Arweave metadata
    if (session.status === 'MINTED' && session.ipfsHash) {
      try {
        const metadataUrl = getArweaveUrl(session.ipfsHash);
        const res = await fetch(metadataUrl);
        if (res.ok) {
          const metadata = await res.json();
          if (metadata.image) {
            // Open in new tab (direct download from Arweave may have CORS issues)
            window.open(metadata.image, '_blank');
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch NFT metadata, falling back:', e);
      }
    }

    // 2. Fallback to previewUrl (only for MINTED, as per user request)
    if (session.status === 'MINTED' && session.previewUrl) {
      window.open(session.previewUrl, '_blank');
      return;
    }

    // 3. Final fallback: generate screenshot
    handleScreenshot('with-title');
  };

  const handleShare = async (
    mode: 'native' | 'copy' | 'twitter' | 'threads' | 'instagram' | 'download'
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

      case 'threads':
        const threadsUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(threadsUrl, '_blank', 'noopener,noreferrer');
        break;

      case 'instagram':
        // Instagram doesn't support direct link sharing via web intent easily.
        // Best UX is to copy link and open Instagram.
        await navigator.clipboard.writeText(shareUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
        window.open('https://instagram.com', '_blank', 'noopener,noreferrer');
        break;

      case 'twitter':
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        break;

      case 'download':
        handleDownload();
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
    <div className="w-full h-screen relative bg-transparent overflow-hidden flex flex-col">
      {/* Header Overlay */}
      <div className="absolute top-8 left-0 w-full p-6 z-10 flex justify-between items-start pointer-events-none">
        <div className="animate-in slide-in-from-top-4 fade-in duration-700 max-w-xl mr-12 md:mr-0">
          {/* Title & Badge */}
          <div className="flex items-start gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg font-mono tracking-tight">
              {session.title || `PROOF #${session.id.slice(0, 8)}`}
            </h1>
            <div
              className={`px-3 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md uppercase tracking-wider shrink-0 mt-2
                        ${
                          session.status === 'MINTED'
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
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={session.user.avatarUrl}
                            alt={authorName}
                            className="w-full h-full object-cover"
                          />
                        </>
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
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={session.user.avatarUrl}
                          alt={authorName}
                          className="w-full h-full object-cover"
                        />
                      </>
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
      <div className="fixed bottom-8 right-6 z-50 flex flex-col gap-3 pointer-events-auto animate-in fade-in duration-700 delay-300">
        {/* Spin Toggle */}
        <button
          onClick={() => setIsSpinning(!isSpinning)}
          className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95 group relative"
          title={isSpinning ? 'Pause Rotation' : 'Resume Rotation'}
        >
          {isSpinning ? (
            <Pause size={20} />
          ) : (
            <Play size={20} className="ml-0.5" />
          )}
        </button>

        {/* Share Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowShareMenu(!showShareMenu);
              setShowMenu(false);
            }}
            className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-full shadow-lg shadow-purple-500/30 transition-all hover:scale-105 active:scale-95"
            title="Share"
          >
            {linkCopied ? <Check size={20} /> : <Share2 size={20} />}
          </button>

          {showShareMenu && (
            <div className="absolute bottom-full right-0 mb-3 w-52 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200">
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
                onClick={() => handleShare('threads')}
                className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
              >
                {/* Threads Icon */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 192 192"
                  fill="currentColor"
                >
                  <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4485 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 61.022 62.7807C52.2708 74.4206 48.7496 89.2619 48.7496 104.571C48.7496 119.317 53.0573 133.568 61.9482 144.359C70.8391 155.149 83.3975 161.439 98.4842 161.439C108.615 161.439 118.068 158.627 125.861 153.253C127.818 151.896 128.273 149.25 126.96 147.288C125.648 145.327 123.004 144.825 121.033 146.126C114.545 150.312 106.636 152.649 98.4842 152.649C85.7442 152.649 75.3195 147.362 67.7554 138.271C60.1913 129.18 56.671 117.224 57.0622 104.571C56.671 91.9174 60.0381 79.2965 67.6599 69.5937C75.2818 59.8909 85.5828 53.535 97.222 53.535C118.91 53.535 129.569 66.2754 130.419 85.1225C115.467 86.8795 91.2008 90.7963 87.2173 111.969C86.7386 114.509 86.3768 117.234 86.3768 120.377C86.3768 128.423 92.545 133.684 101.55 133.684C111.411 133.684 117.618 126.861 119.894 117.915L120.089 117.067C121.216 112.502 121.789 107.508 121.789 102.262C121.782 102.04 121.782 101.82 121.782 101.601C121.782 99.4182 121.722 97.2842 121.579 95.126C121.841 95.1328 122.102 95.1328 122.361 95.1328C131.201 95.1328 136.945 92.8315 139.754 86.0886C140.751 86.5056 141.674 86.9535 142.593 87.4093C143.208 87.7126 143.834 88.022 144.505 88.2917C146.702 89.1729 149.167 88.1009 150.046 85.8927C150.926 83.6846 149.917 81.1689 147.781 80.2524C146.909 79.8808 146.069 79.4678 145.242 79.061C145.053 74.0754 144.029 69.1558 142.203 64.512C140.528 60.1873 138.256 56.1268 135.433 52.417C129.816 45.0195 120.485 39.4217 109.28 36.9587C105.405 36.0954 101.378 35.6563 97.222 35.6563C68.9113 35.6563 45.0441 45.9255 35.5358 64.5501C29.6236 76.1011 26.5414 90.0768 26.5414 105.289C26.5414 120.728 29.8091 134.847 36.0487 146.611C46.3315 166.027 69.8368 176.744 98.4842 176.744C118.006 176.744 133.328 168.97 141.777 155.068C142.924 153.18 142.348 150.706 140.483 149.529C138.618 148.352 136.173 148.918 135.027 150.806C128.016 162.336 114.996 167.953 98.4842 167.953C73.4682 167.953 53.029 158.423 44.1506 141.687C38.6508 131.332 35.7725 119.066 35.7725 105.289C35.7725 91.9056 38.4828 79.6206 43.6644 69.4695C51.9866 53.149 72.8805 44.1534 97.222 44.1534C108.85 44.1534 119.508 46.5492 128.236 51.1077C129.673 51.8478 131.077 52.7042 132.417 53.6811C128.913 52.3331 125.127 51.6253 121.246 51.6253H121.171C117.82 51.6253 114.622 52.122 111.666 52.9967C118.009 46.9934 127.348 44.1534 137.95 44.1534H138.026C163.759 44.1534 179.913 60.4077 179.913 86.6853C179.913 118.966 166.758 141.564 153.754 153.336C152.091 154.841 149.539 154.675 148.064 152.964C146.589 151.253 146.753 148.643 148.416 147.137C160.279 136.4 171.122 116.326 171.122 86.6853C171.122 66.4497 159.431 53.535 138.026 53.535H137.95C124.965 53.535 115.111 60.7719 113.628 72.3323C116.594 72.8228 119.043 74.3986 120.301 77.086C121.603 79.8066 121.498 84.8105 120.378 88.3533L120.061 89.3563C119.98 89.6105 119.897 89.8517 119.807 90.0827C121.2 93.999 123.606 100.22 121.568 106.671C121.111 108.118 120.443 109.479 119.585 110.74C120.287 112.783 120.655 114.935 120.655 117.151C120.655 118.497 121.758 119.587 123.119 119.587C124.479 119.587 125.582 118.497 125.582 117.151C125.582 114.188 125.101 111.233 124.161 108.385C125.758 106.273 126.83 103.881 127.279 101.378C127.502 100.126 127.558 98.7909 127.461 97.4665C129.549 97.9712 131.137 99.854 131.137 102.102C131.137 104.975 128.528 108.625 123.834 108.625C121.821 108.625 119.957 107.671 118.672 105.823C118.067 104.954 117.755 103.951 117.653 102.946C117.518 101.607 117.701 100.287 118.065 99.0343C117.5 97.9407 116.812 96.9208 116.037 95.9926C114.774 94.4842 113.111 93.6027 111.168 93.6027C107.828 93.6027 105.617 96.6577 105.617 100.661C105.617 104.665 107.828 107.72 111.168 107.72C113.111 107.72 114.774 106.839 116.037 105.33C116.208 105.127 116.357 104.912 116.536 104.721L117.173 105.357C117.168 105.419 117.164 105.481 117.164 105.545C117.164 106.335 117.268 107.098 117.461 107.826C116.069 110.428 113.196 112.185 108.822 112.185C102.668 112.185 97.7761 107.567 97.7761 97.2348C97.7761 82.2606 109.95 72.8837 122.062 72.646L122.684 72.5898C123.824 67.3195 127.329 64.9189 132.894 64.9189C136.257 64.9189 139.191 65.7482 141.528 67.2429C142.345 67.7651 142.793 68.7302 142.662 69.6972C142.532 70.6642 141.854 71.4116 140.941 71.5546C138.257 71.9744 136.219 72.3323 134.877 72.6366C131.758 73.3444 130.435 74.9202 129.563 76.9976C128.694 79.0526 128.599 81.3831 129.351 83.2798C130.407 85.9388 132.327 87.2001 134.823 87.2001C137.957 87.2001 141.056 85.3986 144.179 81.7915L144.752 82.2882C143.413 83.8443 141.366 84.8517 139.065 84.8517C136.814 84.8517 134.99 83.9458 133.921 82.4795C133.208 81.5034 132.808 80.352 132.808 79.139C132.808 77.0142 133.567 75.1611 134.795 73.8617C135.539 73.0747 136.564 72.6469 137.662 72.6469C139.096 72.6469 140.25 73.8242 140.25 75.2891C140.25 75.9897 140.678 76.6192 141.298 76.9038C141.918 77.1884 142.613 77.086 143.084 76.6381C145.47 74.3705 146.732 71.7915 146.996 68.8051C147.261 65.8188 146.549 62.7235 144.811 59.489C143.616 57.2657 141.979 55.4328 140.015 54.1206C138.051 52.8084 135.807 52.1706 133.42 52.1706C130.697 52.1706 128.257 52.9248 126.126 54.3466C123.996 55.7684 122.384 57.7314 121.246 60.1066C120.378 61.9189 119.882 63.9515 119.882 66.1102C119.882 72.1135 123.004 81.166 127.348 88.0862C126.974 88.5834 126.68 89.1558 126.505 89.7892C125.86 92.1197 127.183 94.6291 129.569 95.3411C131.954 96.0531 134.464 94.708 135.109 92.3775C135.485 91.0185 137.632 68.6577 142.366 58.7307C146.467 50.1506 157.068 36.9587 179.799 36.9587H180C180.707 36.9587 181.28 36.3857 181.28 35.6787C181.28 34.9717 180.707 34.3986 180 34.3986ZM102.503 107.032C100.864 107.032 99.8225 106.126 99.6644 104.998C99.6418 104.837 99.6418 104.675 99.6644 104.514C99.8225 103.387 100.864 102.481 102.503 102.481C104.143 102.481 105.184 103.387 105.342 104.514C105.365 104.675 105.365 104.837 105.342 104.998C105.184 106.126 104.143 107.032 102.503 107.032Z" />
                </svg>
                Post on Threads
              </button>

              <div className="h-px bg-white/10" />

              <button
                onClick={() => handleShare('instagram')}
                className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
              >
                {/* Instagram Icon */}
                <svg
                  width="16"
                  height="16"
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

        {/* Screenshot Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowMenu(!showMenu);
              setShowShareMenu(false);
            }}
            className="p-2 bg-white text-black hover:bg-zinc-200 rounded-full shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95"
            title="Take Screenshot"
          >
            <Camera size={20} />
          </button>

          {showMenu && (
            <div className="absolute bottom-full right-0 mb-3 w-48 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200">
              <button
                onClick={() => handleScreenshot('art-only')}
                className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <Download size={16} />
                Without Title
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
                href={nftImage ? nftImage : getArweaveUrl(session.ipfsHash)}
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
