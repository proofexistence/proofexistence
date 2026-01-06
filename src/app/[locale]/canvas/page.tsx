'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { isLaunchTime } from '@/lib/launch-config';
import { useWeb3Auth } from '@/lib/web3auth';

const POECanvas = dynamic(
  () => import('@/components/canvas/poe-canvas').then((mod) => mod.POECanvas),
  {
    ssr: false,
    loading: () => <div className="w-full h-screen bg-black" />,
  }
);

export default function CanvasPage() {
  const router = useRouter();
  const { isLoading, isLoggingIn, isConnected, login } = useWeb3Auth();
  const hasTriggeredLogin = useRef(false);

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // Redirect if not launch time (but not for auth - show login instead)
    if (isConnected && !isLaunchTime()) {
      router.push('/');
    }

    // Auto-trigger login if not connected (only once)
    if (!isConnected && !isLoggingIn && !hasTriggeredLogin.current) {
      hasTriggeredLogin.current = true;
      login();
    }
  }, [router, isLoading, isConnected, isLoggingIn, login]);

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  // Check launch time
  if (isConnected && !isLaunchTime()) {
    return <div className="w-full h-screen bg-black" />;
  }

  return (
    <>
      <POECanvas />
      {/* Overlay with back button when not connected */}
      {!isConnected && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            className="absolute top-6 left-4 md:top-8 md:left-6 flex items-center gap-2 bg-black/30 backdrop-blur-xl text-white/80 hover:text-white font-medium px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base rounded-xl transition-all border border-white/10 hover:border-white/20 active:scale-95 shadow-lg shadow-black/20 group"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back
          </button>

          {/* Loading indicator in center */}
          {isLoggingIn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                <p className="text-white/50 text-sm">Connecting...</p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
