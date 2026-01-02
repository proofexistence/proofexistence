'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
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

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // Redirect if not launch time (but not for auth - show login instead)
    if (isConnected && !isLaunchTime()) {
      router.push('/');
    }
  }, [router, isLoading, isConnected]);

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
      {/* Login popup overlay */}
      {!isConnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-sm w-full mx-4 text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                Sign in to Create
              </h2>
              <p className="text-zinc-400 text-sm">
                Connect your wallet to start drawing your light trail
              </p>
            </div>
            <button
              onClick={login}
              disabled={isLoggingIn}
              className={`w-full px-6 py-3 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
                isLoggingIn
                  ? 'bg-zinc-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500'
              }`}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Wallet'
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
