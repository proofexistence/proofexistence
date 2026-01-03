'use client';

import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { useWeb3Auth } from '@/lib/web3auth/context';
import {
  TIME26_ADDRESS,
  TIME26_ABI,
  RPC_URL,
  CHAIN_ID,
  isTestnet,
} from '@/lib/contracts';

export interface WalletBalances {
  pol: {
    raw: bigint;
    formatted: string;
  };
  time26: {
    raw: bigint;
    formatted: string;
  };
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

async function fetchBalances(
  walletAddress: string
): Promise<{ pol: bigint; time26: bigint }> {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || RPC_URL;

  const provider = new ethers.JsonRpcProvider(rpcUrl, {
    chainId: CHAIN_ID,
    name: isTestnet ? 'polygon-amoy' : 'matic',
  });

  // Fetch both balances in parallel
  const [polBalance, time26Balance] = await Promise.all([
    provider.getBalance(walletAddress),
    (async () => {
      const time26Contract = new ethers.Contract(
        TIME26_ADDRESS,
        TIME26_ABI,
        provider
      );
      return time26Contract.balanceOf(walletAddress) as Promise<bigint>;
    })(),
  ]);

  return {
    pol: polBalance,
    time26: time26Balance,
  };
}

function formatBalance(balance: bigint, decimals: number = 18): string {
  const formatted = ethers.formatUnits(balance, decimals);
  // Show 4 decimal places max
  const num = parseFloat(formatted);
  if (num === 0) return '0';
  if (num < 0.0001) return '< 0.0001';
  return num.toFixed(4).replace(/\.?0+$/, '');
}

const defaultBalances: WalletBalances = {
  pol: { raw: BigInt(0), formatted: '0' },
  time26: { raw: BigInt(0), formatted: '0' },
  isLoading: false,
  error: null,
  refresh: () => {},
};

export function useWalletBalances(): WalletBalances {
  const { user, isConnected } = useWeb3Auth();
  const walletAddress = user?.walletAddress;

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['wallet-balances', walletAddress],
    queryFn: () => fetchBalances(walletAddress!),
    enabled: isConnected && !!walletAddress,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
    retry: 2,
  });

  // Return default values if not connected
  if (!isConnected || !walletAddress) {
    return defaultBalances;
  }

  return {
    pol: {
      raw: data?.pol ?? BigInt(0),
      formatted: data?.pol ? formatBalance(data.pol) : '0',
    },
    time26: {
      raw: data?.time26 ?? BigInt(0),
      formatted: data?.time26 ? formatBalance(data.time26) : '0',
    },
    isLoading,
    error: error as Error | null,
    refresh: () => {
      refetch();
    },
  };
}
