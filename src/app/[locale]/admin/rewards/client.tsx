'use client';

import { useWeb3Auth } from '@/lib/web3auth/context';
import { useRewardsStatus } from '@/hooks/use-rewards';
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
  Play,
  XCircle,
  FileCheck,
} from 'lucide-react';
import { useState } from 'react';

// Local interface removed, using type from hook if needed or inferred.

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
  const { user, isLoading: authLoading } = useWeb3Auth();
  const {
    data,
    isLoading: rewardsLoading,
    error: rewardsError,
    refetch,
  } = useRewardsStatus();

  const [isRunningCron, setIsRunningCron] = useState(false);
  const [cronResult, setCronResult] = useState<{
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  } | null>(null);

  const loading = rewardsLoading;
  const error = rewardsError ? (rewardsError as Error).message : null;
  const unauthorized = error === 'Access Denied';

  const fetchData = () => refetch();

  const runCron = async () => {
    if (!user?.walletAddress) return;

    setIsRunningCron(true);
    setCronResult(null);

    try {
      const res = await fetch('/api/cron/daily', {
        method: 'GET',
        headers: {
          'X-Wallet-Address': user.walletAddress,
        },
      });

      const result = await res.json();

      if (result.success) {
        const processedDays = result.rewards?.processedDays?.length || 0;
        const remainingDays = data?.verification?.unprocessedDays
          ? data.verification.unprocessedDays.length - processedDays
          : 0;
        setCronResult({
          success: true,
          message: `處理完成！本次處理 ${processedDays} 天${remainingDays > 0 ? `，還剩 ${remainingDays} 天待處理` : ''}。burnMerkle: ${result.burnMerkle?.success ? '✓' : '✗'}`,
          details: result,
        });
        // Refresh data after cron
        setTimeout(() => refetch(), 2000);
      } else {
        setCronResult({
          success: false,
          message: `Cron failed: ${result.burnMerkle?.error || result.error || 'Unknown error'}`,
          details: result,
        });
      }
    } catch (err) {
      setCronResult({
        success: false,
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    } finally {
      setIsRunningCron(false);
    }
  };

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
      <div className="min-h-screen bg-zinc-950 text-white p-8 pt-24">
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

        {/* Verification Status */}
        {data.verification && (
          <div className="space-y-4">
            {/* Unprocessed Days Warning */}
            {data.verification.hasUnprocessedDays && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                    <div>
                      <div className="font-bold text-amber-400">
                        {data.verification.unprocessedDays.length} 天未處理獎勵
                      </div>
                      <div className="text-sm text-zinc-400">
                        共 {data.verification.totalUnprocessedSessions} 個
                        sessions 待處理
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={runCron}
                    disabled={isRunningCron}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-black font-bold rounded-lg"
                  >
                    {isRunningCron ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        處理中...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        運行 Cron
                      </>
                    )}
                  </button>
                </div>
                {/* List unprocessed days */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.verification.unprocessedDays.slice(0, 10).map((d) => (
                    <span
                      key={d.date}
                      className="px-2 py-1 bg-amber-500/20 rounded text-xs font-mono"
                    >
                      {d.date} ({d.sessionCount})
                    </span>
                  ))}
                  {data.verification.unprocessedDays.length > 10 && (
                    <span className="px-2 py-1 text-xs text-zinc-500">
                      +{data.verification.unprocessedDays.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Snapshot Status */}
            <div
              className={`rounded-xl border p-4 ${
                data.verification.snapshot.matchesOnChain
                  ? 'bg-green-500/10 border-green-500/20'
                  : data.verification.snapshot.onChainRootIsZero
                    ? 'bg-zinc-800/50 border-zinc-700'
                    : 'bg-red-500/10 border-red-500/20'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  {data.verification.snapshot.matchesOnChain ? (
                    <FileCheck className="w-6 h-6 text-green-400" />
                  ) : data.verification.snapshot.onChainRootIsZero ? (
                    <XCircle className="w-6 h-6 text-zinc-500" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  )}
                  <div>
                    <div
                      className={`font-bold ${
                        data.verification.snapshot.matchesOnChain
                          ? 'text-green-400'
                          : data.verification.snapshot.onChainRootIsZero
                            ? 'text-zinc-400'
                            : 'text-red-400'
                      }`}
                    >
                      {data.verification.snapshot.matchesOnChain
                        ? 'Merkle Snapshot 同步 ✓'
                        : data.verification.snapshot.onChainRootIsZero
                          ? 'On-chain Root 尚未設定'
                          : 'Merkle Snapshot 不同步!'}
                    </div>
                    <div className="text-sm text-zinc-400">
                      {data.verification.snapshot.latest ? (
                        <>
                          Snapshot: {data.verification.snapshot.latest.userCount}{' '}
                          users @{' '}
                          {data.verification.snapshot.latest.createdAt
                            ? new Date(
                                data.verification.snapshot.latest.createdAt
                              ).toLocaleString()
                            : 'N/A'}
                        </>
                      ) : (
                        '無 Snapshot 記錄'
                      )}
                    </div>
                  </div>
                </div>
                {!data.verification.snapshot.matchesOnChain &&
                  !data.verification.hasUnprocessedDays && (
                    <button
                      onClick={runCron}
                      disabled={isRunningCron}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-bold rounded-lg"
                    >
                      {isRunningCron ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          同步中...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          同步 Merkle Root
                        </>
                      )}
                    </button>
                  )}
              </div>
            </div>

            {/* Cron Result */}
            {cronResult && (
              <div
                className={`rounded-xl border p-4 ${
                  cronResult.success
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {cronResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span
                    className={`font-bold ${cronResult.success ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {cronResult.success ? 'Cron 成功' : 'Cron 失敗'}
                  </span>
                </div>
                <p className="text-sm text-zinc-400">{cronResult.message}</p>
                {cronResult.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                      查看詳情
                    </summary>
                    <pre className="mt-2 text-xs bg-black/30 p-2 rounded overflow-auto max-h-48">
                      {JSON.stringify(cronResult.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
          <StatCard
            title="Initial Deposit"
            value={formatNumber(
              data.summary.initialDeposit?.formatted || '31536000'
            )}
            description="31,536,000 TIME26"
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
