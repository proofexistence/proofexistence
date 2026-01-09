'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWeb3Auth } from '@/lib/web3auth/context';
import { ShieldX } from 'lucide-react';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Coins,
  Users,
  Calendar,
  TrendingUp,
  Wallet,
  Flame,
  Gift,
  Clock,
  Server,
  Database,
} from 'lucide-react';

interface RewardsStatus {
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

function formatNumber(value: string, decimals = 2): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color = 'blue',
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider opacity-80">
          {title}
        </span>
      </div>
      <div className="text-2xl font-mono font-bold">{value}</div>
      <div className="text-xs opacity-60 mt-1">{description}</div>
    </div>
  );
}

export function AdminRewardsClient() {
  const { user, isConnected, isLoading: authLoading } = useWeb3Auth();
  const [data, setData] = useState<RewardsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.walletAddress) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setUnauthorized(false);
    try {
      const res = await fetch('/api/admin/rewards-status', {
        headers: {
          'X-Wallet-Address': user.walletAddress,
        },
      });
      if (res.status === 403) {
        setUnauthorized(true);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user?.walletAddress]);

  useEffect(() => {
    if (!authLoading && isConnected) {
      fetchData();
    } else if (!authLoading && !isConnected) {
      setUnauthorized(true);
      setLoading(false);
    }
  }, [authLoading, isConnected, fetchData]);

  if (authLoading || (loading && !data)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8 pt-24 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8 pt-24">
        <div className="max-w-md mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
            <ShieldX className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">
              Access Denied
            </h2>
            <p className="text-zinc-400 mb-4">
              You don&apos;t have permission to access the admin panel.
            </p>
            {user?.walletAddress ? (
              <p className="text-xs text-zinc-500 font-mono break-all">
                Connected: {user.walletAddress}
              </p>
            ) : (
              <p className="text-sm text-zinc-500">
                Please connect your wallet to continue.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-400">
              Error Loading Data
            </h2>
            <p className="text-zinc-400 mt-2">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 pt-20 md:pt-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Rewards Admin</h1>
            <p className="text-zinc-500 text-sm">
              {data.network} • Last updated:{' '}
              {new Date(data.timestamp).toLocaleString()}
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Status Banners */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Fund Status */}
          <div
            className={`rounded-xl border p-4 flex items-center gap-4 ${
              data.summary.hasSufficientFunds
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}
          >
            {data.summary.hasSufficientFunds ? (
              <>
                <Coins className="w-8 h-8 text-green-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-green-400">Funds OK</div>
                  <div className="text-sm text-zinc-400 truncate">
                    +{formatNumber(data.summary.surplus.formatted)} T26
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-8 h-8 text-red-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-red-400">Insufficient!</div>
                  <div className="text-sm text-zinc-400 truncate">
                    {formatNumber(data.summary.surplus.formatted)} T26
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Operator Wallet */}
          <div
            className={`rounded-xl border p-4 flex items-center gap-4 ${
              data.operator.hasEnoughGas
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}
          >
            <Server
              className={`w-8 h-8 shrink-0 ${data.operator.hasEnoughGas ? 'text-green-400' : 'text-red-400'}`}
            />
            <div className="min-w-0">
              <div
                className={`font-bold ${data.operator.hasEnoughGas ? 'text-green-400' : 'text-red-400'}`}
              >
                Operator {data.operator.hasEnoughGas ? 'OK' : 'Low Gas!'}
              </div>
              <div className="text-sm text-zinc-400 truncate">
                {formatNumber(data.operator.balanceFormatted, 4)} POL
              </div>
            </div>
          </div>

          {/* Irys Balance */}
          {/* Turbo Credits */}
          <div
            className={`rounded-xl border p-4 flex items-center gap-4 ${
              data.arweave.hasEnoughBalance
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-amber-500/10 border-amber-500/20'
            }`}
          >
            <Database
              className={`w-8 h-8 shrink-0 ${data.arweave.hasEnoughBalance ? 'text-green-400' : 'text-amber-400'}`}
            />
            <div className="min-w-0">
              <div
                className={`font-bold ${data.arweave.hasEnoughBalance ? 'text-green-400' : 'text-amber-400'}`}
              >
                Turbo {data.arweave.hasEnoughBalance ? 'OK' : 'Low!'}
              </div>
              <div className="text-sm text-zinc-400 truncate">
                {formatNumber(data.arweave.balanceFormatted, 6)} AR
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
          <StatCard
            title="Initial Deposit"
            value={formatNumber(
              data.summary.initialDeposit?.formatted || '31500000'
            )}
            description="31.5M TIME26"
            icon={Coins}
            color="blue"
          />
          <StatCard
            title="Contract Balance"
            value={formatNumber(data.contractBalance.formatted)}
            description="Currently in contract"
            icon={Wallet}
            color="blue"
          />
          <StatCard
            title="Total Burned"
            value={formatNumber(data.summary.totalBurned?.formatted || '0')}
            description="From spending"
            icon={Flame}
            color="red"
          />
          <StatCard
            title="Total Claimed"
            value={formatNumber(data.summary.totalOnChainClaimed.formatted)}
            description="On-chain claimed"
            icon={CheckCircle}
            color="green"
          />
        </div>

        {/* Verification Banner */}
        {data.summary.verification && (
          <div
            className={`rounded-xl border p-4 ${
              data.summary.verification.isValid
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="font-bold text-sm mb-1">
                  {data.summary.verification.isValid ? '✅' : '⚠️'}{' '}
                  Verification: {data.summary.verification.formula}
                </div>
                <div className="text-xs text-zinc-400 font-mono">
                  {formatNumber(data.summary.verification.initialDeposit)} ={' '}
                  {formatNumber(data.contractBalance.formatted)} +{' '}
                  {formatNumber(data.summary.totalBurned?.formatted || '0')} +{' '}
                  {formatNumber(data.summary.totalOnChainClaimed.formatted)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">Difference</div>
                <div
                  className={`font-mono ${data.summary.verification.isValid ? 'text-green-400' : 'text-red-400'}`}
                >
                  {formatNumber(data.summary.verification.difference)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="DB Distributed"
            value={formatNumber(data.summary.totalDbBalance.formatted)}
            description="Total rewards in DB"
            icon={TrendingUp}
            color="purple"
          />
          <StatCard
            title="Still Claimable"
            value={formatNumber(data.summary.totalClaimable.formatted)}
            description="DB - Claimed"
            icon={Gift}
            color="amber"
          />
          <StatCard
            title="Pending Burn"
            value={formatNumber(data.summary.totalPendingBurn.formatted)}
            description="Next cron burn"
            icon={Flame}
            color="amber"
          />
          <StatCard
            title="Surplus"
            value={formatNumber(data.summary.surplus.formatted)}
            description="Balance - Claimable"
            icon={Coins}
            color={data.summary.hasSufficientFunds ? 'green' : 'red'}
          />
        </div>

        {/* Contracts Info */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <h2 className="text-lg font-bold mb-3">Contracts & Wallets</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">ProofRecorder:</span>
              <a
                href={`https://${data.network.includes('Amoy') ? 'amoy.' : ''}polygonscan.com/address/${data.contracts.proofRecorder}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-400 hover:underline font-mono"
              >
                {shortenAddress(data.contracts.proofRecorder)}
              </a>
            </div>
            <div>
              <span className="text-zinc-500">TIME26:</span>
              <a
                href={`https://${data.network.includes('Amoy') ? 'amoy.' : ''}polygonscan.com/address/${data.contracts.time26}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-400 hover:underline font-mono"
              >
                {shortenAddress(data.contracts.time26)}
              </a>
            </div>
            <div>
              <span className="text-zinc-500">Operator:</span>
              <a
                href={`https://${data.network.includes('Amoy') ? 'amoy.' : ''}polygonscan.com/address/${data.operator.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-400 hover:underline font-mono"
              >
                {shortenAddress(data.operator.address)}
              </a>
              <span className="ml-2 text-zinc-500">
                ({formatNumber(data.operator.balanceFormatted, 4)} POL)
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Turbo Credits:</span>
              <span className="ml-2 font-mono text-zinc-400">
                {formatNumber(data.arweave.balanceFormatted, 6)} AR (
                {data.arweave.network || 'Turbo'})
              </span>
            </div>
            <div className="md:col-span-2">
              <span className="text-zinc-500">Merkle Root:</span>
              <span className="ml-2 font-mono text-xs text-zinc-400 break-all">
                {data.contracts.merkleRoot}
              </span>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-400" />
            <h2 className="text-lg font-bold">User Balances</h2>
            <span className="text-zinc-500 text-sm">
              ({data.users.length} users)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800/50 text-zinc-400">
                <tr>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-right px-4 py-3">DB Balance</th>
                  <th className="text-right px-4 py-3">Claimed</th>
                  <th className="text-right px-4 py-3">Claimable</th>
                  <th className="text-right px-4 py-3">Pending Burn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">
                        {shortenAddress(user.walletAddress)}
                      </div>
                      {user.username && (
                        <div className="text-zinc-500 text-xs">
                          @{user.username}
                        </div>
                      )}
                    </td>
                    <td className="text-right px-4 py-3 font-mono">
                      {formatNumber(user.dbBalanceFormatted)}
                    </td>
                    <td className="text-right px-4 py-3 font-mono text-green-400">
                      {formatNumber(user.claimedFormatted)}
                    </td>
                    <td className="text-right px-4 py-3 font-mono text-amber-400">
                      {formatNumber(user.claimableFormatted)}
                    </td>
                    <td className="text-right px-4 py-3 font-mono text-red-400">
                      {formatNumber(user.pendingBurnFormatted)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Rewards Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-zinc-400" />
            <h2 className="text-lg font-bold">Daily Rewards History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800/50 text-zinc-400">
                <tr>
                  <th className="text-left px-4 py-3">Day</th>
                  <th className="text-right px-4 py-3">Participants</th>
                  <th className="text-right px-4 py-3">Total Seconds</th>
                  <th className="text-right px-4 py-3">Distributed</th>
                  <th className="text-right px-4 py-3">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.dailyRewards.map((day) => (
                  <tr key={day.dayId} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-mono">{day.dayId}</td>
                    <td className="text-right px-4 py-3">
                      {day.participantCount}
                    </td>
                    <td className="text-right px-4 py-3 font-mono">
                      {day.totalSeconds.toLocaleString()}
                    </td>
                    <td className="text-right px-4 py-3 font-mono text-amber-400">
                      {formatNumber(day.totalDistributedFormatted)}
                    </td>
                    <td className="text-right px-4 py-3 font-mono text-zinc-500">
                      {formatNumber(day.totalBudgetFormatted)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Per-User Rewards */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-400" />
            <h2 className="text-lg font-bold">Recent User Rewards</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800/50 text-zinc-400">
                <tr>
                  <th className="text-left px-4 py-3">Day</th>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-right px-4 py-3">Total Sec</th>
                  <th className="text-right px-4 py-3">Exclusive</th>
                  <th className="text-right px-4 py-3">Shared</th>
                  <th className="text-right px-4 py-3">Base</th>
                  <th className="text-right px-4 py-3">Bonus</th>
                  <th className="text-right px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.recentUserRewards.map((reward, idx) => (
                  <tr
                    key={`${reward.dayId}-${reward.walletAddress}-${idx}`}
                    className="hover:bg-zinc-800/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {reward.dayId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">
                        {shortenAddress(reward.walletAddress)}
                      </div>
                      {reward.username && (
                        <div className="text-zinc-500 text-xs">
                          @{reward.username}
                        </div>
                      )}
                    </td>
                    <td className="text-right px-4 py-3 font-mono">
                      {reward.totalSeconds}
                    </td>
                    <td className="text-right px-4 py-3 font-mono text-green-400">
                      {reward.exclusiveSeconds}
                    </td>
                    <td className="text-right px-4 py-3 font-mono text-blue-400">
                      {reward.sharedSeconds}
                    </td>
                    <td className="text-right px-4 py-3 font-mono">
                      {formatNumber(reward.baseRewardFormatted)}
                    </td>
                    <td className="text-right px-4 py-3 font-mono text-purple-400">
                      {formatNumber(reward.bonusRewardFormatted)}
                    </td>
                    <td className="text-right px-4 py-3 font-mono text-amber-400">
                      {formatNumber(reward.totalRewardFormatted)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Flow Diagram */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Reward Flow Explanation</h2>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <div className="font-bold text-purple-400 mb-2">
                1. Distribution
              </div>
              <p className="text-zinc-400">
                Daily cron calculates rewards based on drawing time and adds to
                DB Balance.
              </p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="font-bold text-red-400 mb-2">2. Burn</div>
              <p className="text-zinc-400">
                Pending burn amounts are burned from contract. Merkle root is
                updated.
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="font-bold text-amber-400 mb-2">3. Claimable</div>
              <p className="text-zinc-400">
                Users can claim their rewards using Merkle proof on-chain.
              </p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="font-bold text-green-400 mb-2">4. Claimed</div>
              <p className="text-zinc-400">
                Claimed amount is tracked on-chain. Users receive TIME26 tokens.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
