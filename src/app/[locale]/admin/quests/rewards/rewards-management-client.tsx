'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { formatEther } from 'ethers';
import { Check, Send, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWeb3Auth } from '@/lib/web3auth';

interface Reward {
  id: string;
  userId: string;
  date: string;
  rewardType: string;
  amount: string;
  status: string;
  milestoneDay: number | null;
  createdAt: Date;
  userName: string | null;
  walletAddress: string | null;
}

interface Stats {
  pendingCount: number;
  approvedCount: number;
  pendingAmount: string;
  approvedAmount: string;
}

interface Props {
  rewards: Reward[];
  stats: Stats;
}

export function RewardsManagementClient({ rewards, stats }: Props) {
  const { user } = useWeb3Auth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (user?.walletAddress) {
    headers['X-Wallet-Address'] = user.walletAddress;
  }

  // Approve selected rewards
  const approveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/admin/quests/rewards/approve', {
        method: 'POST',
        headers,
        body: JSON.stringify({ rewardIds: ids }),
      });
      if (!res.ok) throw new Error('Failed to approve rewards');
      return res.json();
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      window.location.reload();
    },
  });

  // Process approved rewards (send TIME26)
  const processMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/quests/rewards/process', {
        method: 'POST',
        headers,
      });
      if (!res.ok) throw new Error('Failed to process rewards');
      return res.json();
    },
    onSuccess: () => {
      window.location.reload();
    },
  });

  const pendingRewards = rewards.filter((r) => r.status === 'PENDING');
  const approvedRewards = rewards.filter((r) => r.status === 'APPROVED');

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAllPending = () => {
    setSelectedIds(new Set(pendingRewards.map((r) => r.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const formatRewardType = (type: string): string => {
    const map: Record<string, string> = {
      daily_create: 'Create',
      daily_like: 'Like',
      daily_theme: 'Theme',
      streak_daily: 'Streak',
      streak_milestone: 'Milestone',
    };
    return map[type] || type;
  };

  const formatAmount = (amount: string): string => {
    return Number(formatEther(amount || '0')).toLocaleString();
  };

  return (
    <div className="container mx-auto pt-24 pb-8 px-4 space-y-8">
      <h1 className="text-2xl font-bold text-white">Reward Management</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Pending Rewards"
          value={stats.pendingCount.toString()}
          subtext={`${formatAmount(stats.pendingAmount)} TIME26`}
          color="text-yellow-400"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Approved (Ready)"
          value={stats.approvedCount.toString()}
          subtext={`${formatAmount(stats.approvedAmount)} TIME26`}
          color="text-green-400"
        />
      </div>

      {/* Actions Bar */}
      <div className="flex gap-4 flex-wrap">
        <Button
          onClick={selectAllPending}
          variant="outline"
          size="sm"
          disabled={pendingRewards.length === 0}
        >
          Select All Pending ({pendingRewards.length})
        </Button>
        <Button
          onClick={clearSelection}
          variant="ghost"
          size="sm"
          disabled={selectedIds.size === 0}
        >
          Clear Selection
        </Button>
        <Button
          onClick={() => approveMutation.mutate(Array.from(selectedIds))}
          disabled={selectedIds.size === 0 || approveMutation.isPending}
          size="sm"
        >
          <Check className="w-4 h-4 mr-2" />
          Approve Selected ({selectedIds.size})
        </Button>
        <Button
          onClick={() => processMutation.mutate()}
          disabled={approvedRewards.length === 0 || processMutation.isPending}
          size="sm"
          variant="secondary"
        >
          <Send className="w-4 h-4 mr-2" />
          Process Approved ({approvedRewards.length})
        </Button>
      </div>

      {/* Pending Rewards Table */}
      <section className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-4">
          Pending Rewards ({pendingRewards.length})
        </h2>
        {pendingRewards.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">
            No pending rewards
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-4 text-zinc-400 font-medium w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === pendingRewards.length &&
                        pendingRewards.length > 0
                      }
                      onChange={(e) =>
                        e.target.checked ? selectAllPending() : clearSelection()
                      }
                      className="rounded"
                    />
                  </th>
                  <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                    User
                  </th>
                  <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                    Date
                  </th>
                  <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                    Type
                  </th>
                  <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingRewards.map((reward) => (
                  <tr key={reward.id} className="border-b border-white/5">
                    <td className="py-2 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(reward.id)}
                        onChange={() => toggleSelect(reward.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <div className="text-white">
                        {reward.userName || 'Anonymous'}
                      </div>
                      <div className="text-xs text-zinc-500 font-mono">
                        {reward.walletAddress?.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="py-2 px-4 text-zinc-300">{reward.date}</td>
                    <td className="py-2 px-4">
                      <span className="px-2 py-1 rounded text-xs bg-white/10 text-white">
                        {formatRewardType(reward.rewardType)}
                        {reward.milestoneDay && ` (Day ${reward.milestoneDay})`}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-amber-400">
                      {formatAmount(reward.amount)} T26
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Approved Rewards Table */}
      <section className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-4">
          Approved (Ready to Send) ({approvedRewards.length})
        </h2>
        {approvedRewards.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">
            No approved rewards waiting to be sent
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                    User
                  </th>
                  <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                    Date
                  </th>
                  <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                    Type
                  </th>
                  <th className="text-left py-2 px-4 text-zinc-400 font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {approvedRewards.map((reward) => (
                  <tr key={reward.id} className="border-b border-white/5">
                    <td className="py-2 px-4">
                      <div className="text-white">
                        {reward.userName || 'Anonymous'}
                      </div>
                      <div className="text-xs text-zinc-500 font-mono">
                        {reward.walletAddress?.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="py-2 px-4 text-zinc-300">{reward.date}</td>
                    <td className="py-2 px-4">
                      <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                        {formatRewardType(reward.rewardType)}
                        {reward.milestoneDay && ` (Day ${reward.milestoneDay})`}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-amber-400">
                      {formatAmount(reward.amount)} T26
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: string;
}) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-sm text-zinc-500 mb-1">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-sm text-amber-400">{subtext}</div>
    </div>
  );
}
