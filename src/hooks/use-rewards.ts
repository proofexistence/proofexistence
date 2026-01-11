import { useQuery } from '@tanstack/react-query';
import { useWeb3Auth } from '@/lib/web3auth';

export interface RewardsStatus {
  timestamp: string;
  network: string;
  contracts: {
    proofRecorder: string;
    time26: string;
    merkleRoot: string;
  };
  operator: {
    address: string;
    balance: string;
    balanceFormatted: string;
    hasEnoughGas: boolean;
  };
  arweave: {
    balance: string;
    balanceFormatted: string;
    network: string;
    hasEnoughBalance: boolean;
  };
  contractBalance: {
    raw: string;
    formatted: string;
  };
  totalSupply: {
    raw: string;
    formatted: string;
  };
  summary: {
    initialDeposit: { raw: string; formatted: string; description: string };
    totalBurned: { raw: string; formatted: string; description: string };
    totalOnChainClaimed: {
      raw: string;
      formatted: string;
      description: string;
    };
    totalDbBalance: { raw: string; formatted: string; description: string };
    totalClaimable: { raw: string; formatted: string; description: string };
    totalPendingBurn: { raw: string; formatted: string; description: string };
    totalDistributed: { raw: string; formatted: string; description: string };
    surplus: { raw: string; formatted: string; description: string };
    hasSufficientFunds: boolean;
    verification: {
      formula: string;
      initialDeposit: string;
      sum: string;
      difference: string;
      isValid: boolean;
    };
  };
  users: Array<{
    id: string;
    walletAddress: string;
    username: string | null;
    dbBalance: string;
    dbBalanceFormatted: string;
    pendingBurn: string;
    pendingBurnFormatted: string;
    claimed: string;
    claimedFormatted: string;
    claimable: string;
    claimableFormatted: string;
  }>;
  dailyRewards: Array<{
    dayId: string;
    totalBudgetFormatted: string;
    totalSeconds: number;
    totalDistributedFormatted: string;
    participantCount: number;
    settledAt: string;
  }>;
  recentUserRewards: Array<{
    dayId: string;
    walletAddress: string;
    username: string | null;
    totalSeconds: number;
    exclusiveSeconds: number;
    sharedSeconds: number;
    baseRewardFormatted: string;
    bonusRewardFormatted: string;
    totalRewardFormatted: string;
  }>;
}

export function useRewardsStatus() {
  const { user, isConnected } = useWeb3Auth();

  return useQuery({
    queryKey: ['rewards-status', user?.walletAddress],
    queryFn: async () => {
      if (!user?.walletAddress) throw new Error('Not authenticated');

      const res = await fetch('/api/admin/rewards-status', {
        headers: {
          'X-Wallet-Address': user.walletAddress,
        },
      });

      if (res.status === 403) {
        throw new Error('Access Denied');
      }

      if (!res.ok) {
        throw new Error('Failed to fetch rewards status');
      }

      return res.json() as Promise<RewardsStatus>;
    },
    enabled: isConnected && !!user?.walletAddress,
    retry: false,
  });
}
