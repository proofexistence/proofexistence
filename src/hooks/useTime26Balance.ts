'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
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
  const queryClient = useQueryClient();

  const fetcher = async () => {
    const res = await fetch('/api/user/balance', {
      headers: {
        'X-Wallet-Address': walletAddress!,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch balance');
    return res.json() as Promise<BalanceData>;
  };

  const { data, error, isLoading } = useQuery({
    queryKey: ['time26-balance', walletAddress],
    queryFn: fetcher,
    enabled: !!(isConnected && walletAddress),
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    staleTime: 60000, // Dedupe requests within 60s (SWR dedupingInterval equiv)
  });

  const refresh = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: ['time26-balance', walletAddress],
      }),
    [queryClient, walletAddress]
  );

  return {
    balance: data?.balance?.formatted ?? '0',
    balanceRaw: data?.balance?.raw ?? '0',
    walletAddress: data?.walletAddress,
    stats: data?.stats,
    recentRewards: data?.recentRewards ?? [],
    isLoading,
    isError: !!error,
    refresh,
  };
}
