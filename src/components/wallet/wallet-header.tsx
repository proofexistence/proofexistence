'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useNetworkInfo } from '@/hooks/use-network-info';
import { Link } from '@/i18n/navigation';

interface WalletHeaderProps {
  walletAddress: string;
  displayName?: string | null;
  username?: string | null;
  onNavigate?: () => void;
}

export function WalletHeader({
  walletAddress,
  displayName,
  username,
  onNavigate,
}: WalletHeaderProps) {
  const network = useNetworkInfo();
  const [copied, setCopied] = useState(false);

  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : '';

  const handleCopy = async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-4 py-3 border-b border-white/10 bg-white/5">
      {/* Network Badge */}
      <div className="flex items-center justify-between mb-2">
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            network.isTestnet
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-purple-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              network.isTestnet ? 'bg-amber-400' : 'bg-purple-400'
            }`}
          />
          {network.shortName}
        </div>
      </div>

      {/* User Info - Display Name & Username */}
      {(displayName || username) && (
        <Link
          href={username ? `/u/${username}` : `/u/${walletAddress}`}
          onClick={onNavigate}
          className="block mb-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          {displayName && (
            <div className="text-sm font-semibold text-white truncate">
              {displayName}
            </div>
          )}
          {username && (
            <div className="text-xs text-zinc-400 truncate">@{username}</div>
          )}
        </Link>
      )}

      {/* Wallet Address */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono text-zinc-400 truncate">
          {truncatedAddress}
        </span>
        <button
          onClick={handleCopy}
          className="text-zinc-500 hover:text-white transition-colors flex-shrink-0"
          title={copied ? 'Copied!' : 'Copy address'}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
