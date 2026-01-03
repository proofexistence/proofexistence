'use client';

import useSWR from 'swr';
import { useWeb3Auth } from '@/lib/web3auth/context';

interface BalanceData {
  balance: {
    raw: string;
    formatted: string;
  };
  walletAddress: string;
  stats: {
    totalEarned: string;
    totalDrawingSeconds: number;
    daysActive: number;
  };
  recentRewards: Array<{
    date: string;
    drawingSeconds: number;
    exclusiveSeconds: number;
    sharedSeconds: number;
    earned: string;
  }>;
}

export function useTime26Balance() {
  const { user, isConnected } = useWeb3Auth();
  const walletAddress = user?.walletAddress;

  const fetcher = async (url: string) => {
    if (!walletAddress) return null;
    const res = await fetch(url, {
      headers: {
        'X-Wallet-Address': walletAddress,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch balance');
    return res.json();
  };

  const { data, error, isLoading, mutate } = useSWR<BalanceData>(
    isConnected && walletAddress ? '/api/user/balance' : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
    }
  );

  return {
    balance: data?.balance?.formatted ?? '0',
    balanceRaw: data?.balance?.raw ?? '0',
    walletAddress: data?.walletAddress,
    stats: data?.stats,
    recentRewards: data?.recentRewards ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
