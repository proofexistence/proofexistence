'use client';

import { useQuery } from '@tanstack/react-query';
import { useWeb3Auth } from '@/lib/web3auth';

export interface GaslessEligibility {
  eligible: boolean;
  unclaimedBalance: string;
  unclaimedFormatted: string;
  mintCostTime26: string;
  mintCostFormatted: string;
  gasCostTime26: string;
  gasCostFormatted: string;
  totalCostTime26: string;
  totalCostFormatted: string;
  shortfall?: string;
  reason?: 'insufficient_balance' | 'value_too_low';
  gasEstimatePol: string;
  pricing: {
    time26PriceUsd: number;
    polPriceUsd: number;
    conversionRatio: number;
  };
  duration: number;
}

/**
 * Hook to check gasless minting eligibility
 *
 * @param duration - Duration in seconds (must be >= 10)
 * @returns Eligibility status and cost breakdown
 */
export function useGaslessEligibility(duration: number) {
  const { user, isConnected } = useWeb3Auth();
  const walletAddress = user?.walletAddress;

  return useQuery<GaslessEligibility>({
    queryKey: ['gasless-eligibility', walletAddress, duration],
    queryFn: async () => {
      if (!walletAddress) {
        throw new Error('No wallet connected');
      }

      const res = await fetch(
        `/api/mint/gasless/eligibility?duration=${Math.floor(duration)}`,
        {
          headers: {
            'X-Wallet-Address': walletAddress,
          },
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to check eligibility');
      }

      return res.json();
    },
    enabled: isConnected && !!walletAddress && duration >= 10,
    staleTime: 1000 * 30, // 30 seconds - gas prices change
    refetchInterval: 1000 * 60, // Refresh every minute
    retry: 2,
  });
}

/**
 * Hook to perform gasless minting
 */
export function useGaslessMint() {
  const { user } = useWeb3Auth();
  const walletAddress = user?.walletAddress;

  const mint = async (params: {
    sessionId: string;
    metadataURI: string;
    displayName: string;
    message: string;
    duration: number;
  }) => {
    if (!walletAddress) {
      throw new Error('No wallet connected');
    }

    // Server waits up to 120s for tx confirmation, add buffer for network latency
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 150000); // 150 seconds

    try {
      const res = await fetch('/api/mint/gasless', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress,
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!res.ok) {
        const error = await res.json();
        // Include validation details if available
        const message = error.details
          ? `${error.error}: ${JSON.stringify(error.details)}`
          : error.error || 'Gasless mint failed';
        throw new Error(message);
      }

      return res.json() as Promise<{
        success: boolean;
        txHash: string;
        tokenId: string | null;
        balanceDeducted: string;
        mintCost: string;
        gasCost: string;
      }>;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Minting timed out. Please check your transaction history.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return { mint };
}
