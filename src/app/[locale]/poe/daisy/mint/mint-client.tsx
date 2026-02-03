'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';
import {
  Calendar,
  Loader2,
  Sparkles,
  Users,
  Image as ImageIcon,
  Clock,
  CheckCircle,
  Gift,
  Gavel,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { useWeb3Auth } from '@/lib/web3auth';
import { Button } from '@/components/ui/button';
import {
  DAISY_STANDARD_ADDRESS,
  DAISY_STANDARD_ABI,
  DAISY_GENESIS_ADDRESS,
  DAISY_GENESIS_ABI,
  BLOCK_EXPLORER,
} from '@/lib/contracts';

interface DaisyMintInfo {
  date: string;
  status: string;
  genesis: {
    tokenId: number | null;
    arweaveHash: string | null;
    auctionStartPrice: number;
    currentBid: string | null;
    highestBidder: string | null;
    endTime: string | null;
    settled: boolean;
    mintedTo: string | null;
  };
  standard: {
    arweaveHash: string | null;
    mintCount: number;
    currentPrice: number;
    priceFactors: {
      quarterBasePrice: number;
      timeMultiplier: number;
      participantMultiplier: number;
      dateMultiplier: number;
      dateReason: string | null;
    };
  };
  theme: string | null;
  dominantColor: string | null;
  previewUrl: string | null;
  participantCount: number;
  sessionCount: number;
  isSpecialDay: boolean;
  specialDayName: string | null;
  user: {
    canClaimFree: boolean;
    hasClaimed: boolean;
    hasMinted: boolean;
    merkleProof: string[];
  } | null;
}

interface MintClientProps {
  initialDate: string;
  availableDates: string[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimeRemaining(endTime: string): string {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) return 'Ended';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function MintClient({ initialDate, availableDates }: MintClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const { provider, isConnected, user, login } = useWeb3Auth();

  const [selectedDate, setSelectedDate] = useState(
    searchParams.get('date') || initialDate
  );
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Update current time every second for auction countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch mint info for selected date
  const {
    data: mintInfo,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['daisy-mint', selectedDate],
    queryFn: async (): Promise<DaisyMintInfo> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (user?.walletAddress) {
        headers['X-Wallet-Address'] = user.walletAddress;
      }

      const res = await fetch(`/api/daisy/mint?date=${selectedDate}`, {
        headers,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch mint info');
      }

      return res.json();
    },
    enabled: !!selectedDate,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute for auction updates
  });

  // Claim free mint mutation
  const claimFreeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.walletAddress || !provider) {
        throw new Error('Wallet not connected');
      }

      // First, call API to record claim and get Merkle proof
      const res = await fetch('/api/daisy/mint/claim-free', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': user.walletAddress,
        },
        body: JSON.stringify({ date: selectedDate }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to claim');
      }

      const { merkleProof, contractParams } = await res.json();

      // Then call the contract to mint
      const ethersProvider = new ethers.BrowserProvider(
        provider as ethers.Eip1193Provider
      );
      const signer = await ethersProvider.getSigner();
      const contract = new ethers.Contract(
        DAISY_STANDARD_ADDRESS,
        DAISY_STANDARD_ABI,
        signer
      );

      const tx = await contract.mintFree(contractParams.date, merkleProof);
      const receipt = await tx.wait();

      return receipt.hash;
    },
    onSuccess: (txHash) => {
      setMintSuccess(`Free mint claimed! TX: ${txHash}`);
      setMintError(null);
      queryClient.invalidateQueries({ queryKey: ['daisy-mint', selectedDate] });
    },
    onError: (err: Error) => {
      setMintError(err.message);
      setMintSuccess(null);
    },
  });

  // Paid mint mutation
  const paidMintMutation = useMutation({
    mutationFn: async () => {
      if (!user?.walletAddress || !provider || !mintInfo) {
        throw new Error('Wallet not connected');
      }

      const ethersProvider = new ethers.BrowserProvider(
        provider as ethers.Eip1193Provider
      );
      const signer = await ethersProvider.getSigner();
      const contract = new ethers.Contract(
        DAISY_STANDARD_ADDRESS,
        DAISY_STANDARD_ABI,
        signer
      );

      const dateNum = parseInt(selectedDate.replace(/-/g, '')); // YYYYMMDD
      const price = ethers.parseEther(
        mintInfo.standard.currentPrice.toString()
      );

      const tx = await contract.mint(dateNum, { value: price });
      const receipt = await tx.wait();

      return receipt.hash;
    },
    onSuccess: (txHash) => {
      setMintSuccess(`Minted successfully! TX: ${txHash}`);
      setMintError(null);
      queryClient.invalidateQueries({ queryKey: ['daisy-mint', selectedDate] });
    },
    onError: (err: Error) => {
      setMintError(err.message);
      setMintSuccess(null);
    },
  });

  // Genesis bid mutation
  const bidMutation = useMutation({
    mutationFn: async (bidAmount: string) => {
      if (!user?.walletAddress || !provider) {
        throw new Error('Wallet not connected');
      }

      const ethersProvider = new ethers.BrowserProvider(
        provider as ethers.Eip1193Provider
      );
      const signer = await ethersProvider.getSigner();
      const contract = new ethers.Contract(
        DAISY_GENESIS_ADDRESS,
        DAISY_GENESIS_ABI,
        signer
      );

      const dateNum = parseInt(selectedDate.replace(/-/g, '')); // YYYYMMDD
      const bidValue = ethers.parseEther(bidAmount);

      const tx = await contract.bid(dateNum, { value: bidValue });
      const receipt = await tx.wait();

      return receipt.hash;
    },
    onSuccess: (txHash) => {
      setMintSuccess(`Bid placed! TX: ${txHash}`);
      setMintError(null);
      queryClient.invalidateQueries({ queryKey: ['daisy-mint', selectedDate] });
    },
    onError: (err: Error) => {
      setMintError(err.message);
      setMintSuccess(null);
    },
  });

  // Handle date selection
  const handleDateSelect = useCallback(
    (date: string) => {
      setSelectedDate(date);
      setMintError(null);
      setMintSuccess(null);
      router.push(`?date=${date}`, { scroll: false });
    },
    [router]
  );

  // Get last 7 available dates
  const recentDates = availableDates.slice(0, 7);

  // Compute auction status (must be called before early returns)
  const isAuctionActive = useMemo(() => {
    if (!mintInfo) return false;
    return (
      mintInfo.genesis.endTime &&
      !mintInfo.genesis.settled &&
      new Date(mintInfo.genesis.endTime).getTime() > currentTime
    );
  }, [mintInfo, currentTime]);

  const minNextBid = useMemo(() => {
    if (!mintInfo) return '0';
    return mintInfo.genesis.currentBid
      ? (parseFloat(mintInfo.genesis.currentBid) * 1.1).toFixed(2)
      : mintInfo.genesis.auctionStartPrice.toString();
  }, [mintInfo]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading mint info...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600 dark:text-red-400 text-center">
          {(error as Error).message}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!mintInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-600 dark:text-gray-400">
          No Daisy NFT available for this date
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Date Selector */}
      <div className="flex flex-wrap justify-center gap-2">
        {recentDates.map((date) => (
          <button
            key={date}
            onClick={() => handleDateSelect(date)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              date === selectedDate
                ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-pink-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4 inline-block mr-1 -mt-0.5" />
            {new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </button>
        ))}
      </div>

      {/* Preview Image */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl">
        {mintInfo.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mintInfo.previewUrl}
            alt={`Daisy NFT for ${formatDate(selectedDate)}`}
            className="w-full aspect-square object-cover"
          />
        ) : (
          <div className="w-full aspect-square bg-gradient-to-br from-pink-200 to-orange-200 dark:from-pink-900 dark:to-orange-900 flex items-center justify-center">
            <ImageIcon className="w-24 h-24 text-pink-400 dark:text-pink-600 opacity-50" />
          </div>
        )}

        {/* Special Day Badge */}
        {mintInfo.isSpecialDay && mintInfo.specialDayName && (
          <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
            <Sparkles className="w-4 h-4 inline-block mr-1 -mt-0.5" />
            {mintInfo.specialDayName}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
          <Users className="w-5 h-5 text-pink-500 mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {mintInfo.participantCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Participants
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
          <ImageIcon className="w-5 h-5 text-orange-500 mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {mintInfo.sessionCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Sessions
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
          <Sparkles className="w-5 h-5 text-purple-500 mb-2" />
          <div className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {mintInfo.theme || 'Classic'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Theme</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
          <Gift className="w-5 h-5 text-green-500 mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {mintInfo.standard.mintCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Minted</div>
        </div>
      </div>

      {/* Genesis Auction Card */}
      {!mintInfo.genesis.settled && (
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-4">
            <Gavel className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Genesis Edition (1/1)
            </h2>
          </div>

          {isAuctionActive ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Current Bid
                  </div>
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {mintInfo.genesis.currentBid ||
                      mintInfo.genesis.auctionStartPrice}{' '}
                    POL
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4 inline-block mr-1" />
                    {formatTimeRemaining(mintInfo.genesis.endTime!)}
                  </div>
                  {mintInfo.genesis.highestBidder && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Leader: {truncateAddress(mintInfo.genesis.highestBidder)}
                    </div>
                  )}
                </div>
              </div>

              {isConnected ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min={minNextBid}
                    placeholder={`Min: ${minNextBid} POL`}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    id="bid-amount"
                  />
                  <Button
                    onClick={() => {
                      const input = document.getElementById(
                        'bid-amount'
                      ) as HTMLInputElement;
                      if (input.value) {
                        bidMutation.mutate(input.value);
                      }
                    }}
                    disabled={bidMutation.isPending}
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    {bidMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Place Bid'
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={login}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                >
                  Connect Wallet to Bid
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              {mintInfo.genesis.mintedTo ? (
                <div>
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-300">
                    Won by {truncateAddress(mintInfo.genesis.mintedTo)}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Auction not started
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Standard Edition Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-6 h-6 text-pink-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Standard Edition (Unlimited)
          </h2>
        </div>

        {/* Price Breakdown */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600 dark:text-gray-300">
              Current Price
            </span>
            <span className="text-2xl font-bold text-pink-600 dark:text-pink-400">
              {mintInfo.standard.currentPrice} POL
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>
                Base Price (Q
                {Math.ceil((new Date(selectedDate).getMonth() + 1) / 3)})
              </span>
              <span>{mintInfo.standard.priceFactors.quarterBasePrice} POL</span>
            </div>
            {mintInfo.standard.priceFactors.participantMultiplier > 1 && (
              <div className="flex justify-between">
                <span>
                  Participant Bonus ({mintInfo.participantCount}+ users)
                </span>
                <span>
                  x{mintInfo.standard.priceFactors.participantMultiplier}
                </span>
              </div>
            )}
            {mintInfo.standard.priceFactors.dateMultiplier > 1 && (
              <div className="flex justify-between text-yellow-600 dark:text-yellow-400">
                <span>{mintInfo.standard.priceFactors.dateReason}</span>
                <span>x{mintInfo.standard.priceFactors.dateMultiplier}</span>
              </div>
            )}
          </div>
        </div>

        {/* User Status */}
        {mintInfo.user && (
          <div className="mb-4 space-y-2">
            {mintInfo.user.hasClaimed && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Free edition claimed</span>
              </div>
            )}
            {mintInfo.user.hasMinted && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Paid edition minted</span>
              </div>
            )}
          </div>
        )}

        {/* Mint Buttons */}
        <div className="space-y-3">
          {!isConnected ? (
            <Button
              onClick={login}
              className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white"
            >
              Connect Wallet to Mint
            </Button>
          ) : (
            <>
              {/* Free Claim Button */}
              {mintInfo.user?.canClaimFree && !mintInfo.user?.hasClaimed && (
                <Button
                  onClick={() => claimFreeMutation.mutate()}
                  disabled={claimFreeMutation.isPending}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  {claimFreeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Gift className="w-4 h-4 mr-2" />
                  )}
                  Claim Free (Participant Reward)
                </Button>
              )}

              {/* Paid Mint Button */}
              {!mintInfo.user?.hasMinted && (
                <Button
                  onClick={() => paidMintMutation.mutate()}
                  disabled={paidMintMutation.isPending}
                  className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white"
                >
                  {paidMintMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Mint for {mintInfo.standard.currentPrice} POL
                </Button>
              )}

              {mintInfo.user?.hasClaimed && mintInfo.user?.hasMinted && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p>You already own both editions!</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Success/Error Messages */}
        {mintSuccess && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">{mintSuccess}</span>
            </div>
            <a
              href={`${BLOCK_EXPLORER}/tx/${mintSuccess.split('TX: ')[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 dark:text-green-400 hover:underline mt-1 inline-flex items-center gap-1"
            >
              View on Explorer
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {mintError && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{mintError}</span>
            </div>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          Daisy NFTs are generated from daily collective art sessions.
          <br />
          Each day&apos;s artwork is unique and captures the community&apos;s
          creative energy.
        </p>
      </div>
    </div>
  );
}
