'use client';

import { useWeb3Auth } from '@/lib/web3auth';
import { Loader2 } from 'lucide-react';

interface MobileConnectButtonProps {
  children: React.ReactNode;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

export function MobileConnectButton({
  children,
  className,
}: MobileConnectButtonProps) {
  const { login, isLoggingIn } = useWeb3Auth();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggingIn) {
      login();
    }
  };

  return (
    <div onClick={handleClick} className={className}>
      {isLoggingIn ? (
        <button
          disabled
          className="px-5 py-2.5 rounded-full bg-zinc-700 text-zinc-400 text-sm font-medium flex items-center gap-2 cursor-not-allowed"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Connecting...
        </button>
      ) : (
        children
      )}
    </div>
  );
}
