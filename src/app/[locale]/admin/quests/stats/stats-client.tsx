'use client';

import { formatEther } from 'ethers';
import { Users, Flame, Award } from 'lucide-react';

interface Props {
  totalRewards: string;
  rewardsByType: Array<{ type: string; count: number; total: string }>;
  activeUsers7d: number;
  streakDistribution: Array<{ bucket: string; count: number }>;
  dailyRates: Array<{
    date: string;
    totalUsers: number;
    createdCount: number;
    likedCount: number;
    themeCount: number;
  }>;
}

export function StatsClient({
  totalRewards,
  rewardsByType,
  activeUsers7d,
  streakDistribution,
  dailyRates,
}: Props) {
  const formattedTotal = Number(
    formatEther(totalRewards || '0')
  ).toLocaleString();

  return (
    <div className="container mx-auto pt-24 pb-8 px-4 space-y-8">
      <h1 className="text-2xl font-bold text-white">Quest Statistics</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Award className="w-6 h-6" />}
          label="Total TIME26 Distributed"
          value={`${formattedTotal} TIME26`}
          color="text-amber-400"
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Active Users (7 Days)"
          value={activeUsers7d.toLocaleString()}
          color="text-blue-400"
        />
        <StatCard
          icon={<Flame className="w-6 h-6" />}
          label="Avg Streak"
          value={calculateAvgStreak(streakDistribution)}
          color="text-orange-400"
        />
      </div>

      {/* Rewards by Type */}
      <section className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-4">
          Rewards by Type
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {rewardsByType.length === 0 ? (
            <div className="col-span-full text-center text-zinc-500 py-4">
              No rewards yet
            </div>
          ) : (
            rewardsByType.map((item) => (
              <div
                key={item.type}
                className="bg-white/5 rounded-lg p-4 text-center"
              >
                <div className="text-xs text-zinc-500 uppercase mb-1">
                  {formatRewardType(item.type)}
                </div>
                <div className="text-xl font-bold text-white">
                  {item.count.toLocaleString()}
                </div>
                <div className="text-sm text-amber-400">
                  {Number(formatEther(item.total || '0')).toLocaleString()} T26
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Streak Distribution */}
      <section className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-4">
          Streak Distribution
        </h2>
        {streakDistribution.length === 0 ? (
          <div className="text-center text-zinc-500 py-4">No streaks yet</div>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {streakDistribution.map((item) => {
              const maxCount = Math.max(
                ...streakDistribution.map((d) => d.count)
              );
              const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div
                  key={item.bucket}
                  className="flex-1 flex flex-col items-center"
                >
                  <div
                    className="w-full bg-purple-500/60 rounded-t min-h-[4px]"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <div className="text-xs text-zinc-400 mt-2">{item.bucket}</div>
                  <div className="text-xs text-white">{item.count}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Daily Completion Rates */}
      <section className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-4">
          Daily Task Completion (Last 7 Days)
        </h2>
        {dailyRates.length === 0 ? (
          <div className="text-center text-zinc-500 py-4">No data yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-zinc-500 text-sm">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Users</th>
                  <th className="pb-2">Created</th>
                  <th className="pb-2">Liked 3+</th>
                  <th className="pb-2">Theme</th>
                </tr>
              </thead>
              <tbody>
                {dailyRates.map((day) => (
                  <tr key={day.date} className="border-t border-white/10">
                    <td className="py-2 text-zinc-300">{day.date}</td>
                    <td className="py-2 text-white">{day.totalUsers}</td>
                    <td className="py-2 text-green-400">
                      {day.createdCount} (
                      {day.totalUsers > 0
                        ? ((day.createdCount / day.totalUsers) * 100).toFixed(0)
                        : 0}
                      %)
                    </td>
                    <td className="py-2 text-blue-400">
                      {day.likedCount} (
                      {day.totalUsers > 0
                        ? ((day.likedCount / day.totalUsers) * 100).toFixed(0)
                        : 0}
                      %)
                    </td>
                    <td className="py-2 text-purple-400">
                      {day.themeCount} (
                      {day.totalUsers > 0
                        ? ((day.themeCount / day.totalUsers) * 100).toFixed(0)
                        : 0}
                      %)
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
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-sm text-zinc-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function formatRewardType(type: string): string {
  const map: Record<string, string> = {
    daily_create: 'Create',
    daily_like: 'Like',
    daily_theme: 'Theme',
    streak_daily: 'Streak',
    streak_milestone: 'Milestone',
  };
  return map[type] || type;
}

function calculateAvgStreak(
  distribution: Array<{ bucket: string; count: number }>
): string {
  const midpoints: Record<string, number> = {
    '0': 0,
    '1-3': 2,
    '4-7': 5.5,
    '8-14': 11,
    '15-30': 22.5,
    '30+': 40,
  };

  let total = 0;
  let count = 0;
  distribution.forEach((d) => {
    total += (midpoints[d.bucket] || 0) * d.count;
    count += d.count;
  });

  return count > 0 ? (total / count).toFixed(1) + ' days' : '0 days';
}
