'use client';

import { useState, useEffect } from 'react';
import { SignInButton } from '@clerk/nextjs';
import { useWeb3Auth } from '@/lib/web3auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

// Feature flag
const USE_WEB3AUTH = process.env.NEXT_PUBLIC_USE_WEB3AUTH === 'true';

interface MobileConnectButtonProps {
  children: React.ReactNode;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

export function MobileConnectButton({
  children,
  className,
  onOpenChange,
}: MobileConnectButtonProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  // Always call hook unconditionally to satisfy React hooks rules
  const web3AuthData = useWeb3Auth();

  useEffect(() => {
    // Basic mobile detection
    const checkMobile = () => {
      const userAgent =
        typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
      const mobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent
        );
      setIsMobile(mobile);

      // Check for injected ethereum provider
      const ethereum = window.ethereum;
      setHasWallet(!!ethereum);
    };

    checkMobile();
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (USE_WEB3AUTH) {
      // Web3Auth handles mobile wallets internally
      e.preventDefault();
      e.stopPropagation();
      web3AuthData.login();
      return;
    }

    if (isMobile && !hasWallet) {
      e.preventDefault();
      e.stopPropagation();
      setShowDialog(true);
      onOpenChange?.(true);
    }
  };

  const getDeepLink = (scheme: string) => {
    if (typeof window === 'undefined') return '#';
    const currentUrl = window.location.href;
    // Remove protocol 'https://'
    const urlNoProtocol = currentUrl.replace(/^https?:\/\//, '');
    return `${scheme}://dapp/${urlNoProtocol}`;
  };

  // Web3Auth mode: Simple button that triggers login
  if (USE_WEB3AUTH) {
    return (
      <div onClick={handleClick} className={className}>
        {children}
      </div>
    );
  }

  // Clerk mode: Mobile without wallet - show dialog
  if (isMobile && !hasWallet) {
    return (
      <>
        <div onClickCapture={handleClick} className={className}>
          {children}
        </div>

        <Dialog
          open={showDialog}
          onOpenChange={(open) => {
            setShowDialog(open);
            onOpenChange?.(open);
          }}
        >
          <DialogContent className="sm:max-w-md bg-black/90 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Connect Wallet</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Mobile browsers don&apos;t support wallet extensions directly.
                Please open this site in your wallet app.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-4">
              <a
                href={getDeepLink('metamask')}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="w-10 h-10 relative">
                  <Image
                    src="https://wd51a2qvzp.ufs.sh/f/16893e42-1e96-4127-b08e-8a712217f2ca-2h533j.svg"
                    fill
                    alt="MetaMask"
                    className="object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-bold">Open in MetaMask</div>
                  <div className="text-xs text-zinc-500">
                    Deep link to MetaMask App
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-white" />
              </a>

              <a
                href={getDeepLink('okx')}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="w-10 h-10 relative flex items-center justify-center bg-black/50 rounded-full border border-white/10">
                  <span className="font-bold text-[10px]">OKX</span>
                </div>
                <div className="flex-1">
                  <div className="font-bold">Open in OKX Wallet</div>
                  <div className="text-xs text-zinc-500">
                    Deep link to OKX App
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-white" />
              </a>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black px-2 text-zinc-500">Or</span>
                </div>
              </div>

              {/* Allow standard sign in for other methods (Email, Coinbase etc) */}
              <SignInButton mode="modal">
                <button className="w-full py-3 rounded-xl bg-white text-black font-medium hover:bg-zinc-200 transition-colors">
                  Continue with Other Method
                </button>
              </SignInButton>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Clerk mode: Default behavior for Desktop or In-App Browser
  return <SignInButton mode="modal">{children}</SignInButton>;
}
