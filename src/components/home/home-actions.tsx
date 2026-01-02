'use client';

import {
  useUserSafe as useUser,
  useClerkSafe as useClerk,
} from '@/lib/clerk/safe-hooks';
import { useWeb3Auth } from '@/lib/web3auth';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatedGradientText } from '@/registry/magicui/animated-gradient-text';
import { LineSquiggle } from '@/components/icons/line-squiggle';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Feature flag
const USE_WEB3AUTH = process.env.NEXT_PUBLIC_USE_WEB3AUTH === 'true';

export function HomeActions() {
  // Always call all hooks unconditionally to satisfy React hooks rules
  const clerkData = useUser();
  const clerkActions = useClerk();
  const web3AuthData = useWeb3Auth();

  // Select which data to use based on feature flag
  const isLoaded = USE_WEB3AUTH ? !web3AuthData.isLoading : clerkData.isLoaded;
  const isSignedIn = USE_WEB3AUTH
    ? web3AuthData.isConnected
    : clerkData.isSignedIn;
  const handleLogin = USE_WEB3AUTH
    ? () => web3AuthData.login()
    : () => clerkActions.openSignIn({ forceRedirectUrl: '/' });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6 items-center">
      {/* Main Action Area */}
      <div className="flex flex-col md:flex-row gap-6 items-center">
        {isLoaded && !isSignedIn && (
          <button
            onClick={handleLogin}
            className="group relative px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full font-semibold text-white transition-all hover:bg-white/20 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            <span className="relative z-10 flex items-center gap-2">
              Connect Wallet
              <svg
                className="w-5 h-5 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </span>
          </button>
        )}

        {isLoaded && isSignedIn && (
          <div className="flex flex-col gap-4 items-center animate-fade-in">
            <Link
              href="/canvas"
              className="group relative mx-auto flex items-center justify-center rounded-full px-4 py-1.5 shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f]"
            >
              <span
                className={cn(
                  'animate-gradient absolute inset-0 block h-full w-full rounded-[inherit] bg-gradient-to-r from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-[length:300%_100%] p-[1px]'
                )}
                style={{
                  WebkitMask:
                    'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'destination-out',
                  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  maskComposite: 'subtract',
                  WebkitClipPath: 'padding-box',
                }}
              />
              <LineSquiggle className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
              <hr className="mx-2 h-4 w-px shrink-0 bg-neutral-500" />
              <AnimatedGradientText className="text-sm font-medium from-[#ffaa40] via-[#9c40ff] to-[#ffaa40]">
                Enter the Eternal
              </AnimatedGradientText>
              <ChevronRight className="ml-1 size-4 stroke-neutral-500 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
