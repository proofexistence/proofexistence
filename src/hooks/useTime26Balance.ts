'use client';

import useSWR from 'swr';

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTime26Balance() {
  const { data, error, isLoading, mutate } = useSWR<BalanceData>(
    '/api/user/balance',
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
    }
  );

  return {
    balance: data?.balance.formatted ?? '0',
    balanceRaw: data?.balance.raw ?? '0',
    walletAddress: data?.walletAddress,
    stats: data?.stats,
    recentRewards: data?.recentRewards ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
