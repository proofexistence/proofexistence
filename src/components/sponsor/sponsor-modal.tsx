'use client';

import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useWeb3Auth } from '@/lib/web3auth';
import { WalletAddressDisplay } from './wallet-address-display';
import {
  SPONSOR_WALLETS,
  type ChainConfig,
  type Token,
} from '@/lib/sponsor/wallet-config';

interface SponsorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SponsorModal({ open, onOpenChange }: SponsorModalProps) {
  const { isConnected, isLoading: isAuthLoading, login } = useWeb3Auth();
  const [selectedChain, setSelectedChain] = useState<ChainConfig>(
    SPONSOR_WALLETS[0]
  );
  const [selectedToken, setSelectedToken] = useState<Token>(
    SPONSOR_WALLETS[0].tokens[0]
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleChainSelect = (chain: ChainConfig) => {
    setSelectedChain(chain);
    setSelectedToken(chain.tokens[0]);
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/95 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Heart className="w-5 h-5 text-purple-400" />
            Sponsor a Stranger
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Your donation sponsors gas-free proofs for strangers worldwide.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Auth Gate */}
          {!isConnected && !isAuthLoading ? (
            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-sm text-zinc-400 mb-4">
                  Connect your wallet to view donation addresses securely.
                </p>
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors text-sm font-medium flex items-center gap-2 mx-auto"
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
          ) : isAuthLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : (
            <>
              {/* Chain Selector */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-500">Select Network</label>
                <div className="flex gap-2">
                  {SPONSOR_WALLETS.map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => handleChainSelect(chain)}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        selectedChain.id === chain.id
                          ? `bg-gradient-to-r ${chain.color} text-white`
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      {chain.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Token Selector (only show if chain has multiple tokens) */}
              {selectedChain.tokens.length > 1 && (
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">Select Token</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedChain.tokens.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => setSelectedToken(token)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedToken.symbol === token.symbol
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 border border-transparent'
                        }`}
                      >
                        {token.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Wallet Address Display */}
              <WalletAddressDisplay
                chain={selectedChain}
                token={selectedToken}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
