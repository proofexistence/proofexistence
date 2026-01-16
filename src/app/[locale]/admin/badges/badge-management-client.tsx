'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Award, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWeb3Auth } from '@/lib/web3auth';
import Image from 'next/image';

interface Badge {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  awardCount: number;
}

interface EarlyAdopterStats {
  totalEligible: number;
  currentlyAwarded: number;
}

interface RecentAward {
  badgeId: string | null;
  badgeName: string | null;
  userName: string | null;
  walletAddress: string | null;
  awardedAt: Date | null;
}

interface Props {
  badges: Badge[];
  earlyAdopterStats: EarlyAdopterStats;
  recentAwards: RecentAward[];
}

interface AwardDetails {
  awarded: number;
  alreadyHad: number;
  errors: number;
}

export function BadgeManagementClient({
  badges,
  earlyAdopterStats,
  recentAwards,
}: Props) {
  const { user } = useWeb3Auth();
  const [awardResult, setAwardResult] = useState<{
    success: boolean;
    message: string;
    details?: AwardDetails;
  } | null>(null);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (user?.walletAddress) {
    headers['X-Wallet-Address'] = user.walletAddress;
  }

  // Award Early Adopter badges
  const awardEarlyAdopterMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/badges/award?type=early-adopter', {
        method: 'GET',
        headers,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to award badges');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setAwardResult({
        success: true,
        message: 'Early Adopter badges awarded successfully',
        details: data.results,
      });
      // Reload page after 2 seconds to show updated stats
      setTimeout(() => window.location.reload(), 2000);
    },
    onError: (error: Error) => {
      setAwardResult({
        success: false,
        message: error.message,
      });
    },
  });

  const earlyAdopterBadge = badges.find(
    (b) => b.id === 'early-adopter-top-100'
  );
  const needsUpdate =
    earlyAdopterStats.totalEligible > earlyAdopterStats.currentlyAwarded;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 pt-24 pb-8 px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            徽章管理 Badge Management
          </h1>
          <p className="text-zinc-400">
            管理和頒發用戶徽章 Manage and award user badges
          </p>
        </div>

        {/* Early Adopter Section */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-bold text-white">
              Early Adopter Top 100
            </h2>
            {needsUpdate && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-sm rounded-full border border-amber-500/30">
                需要更新 Needs Update
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-zinc-400">符合資格</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {earlyAdopterStats.totalEligible}
              </div>
              <div className="text-xs text-zinc-500">
                Top 100 users who created proofs
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-zinc-400">已頒發</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {earlyAdopterStats.currentlyAwarded}
              </div>
              <div className="text-xs text-zinc-500">
                Currently awarded badges
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-zinc-400">待頒發</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {earlyAdopterStats.totalEligible -
                  earlyAdopterStats.currentlyAwarded}
              </div>
              <div className="text-xs text-zinc-500">Pending awards</div>
            </div>
          </div>

          {/* Award Button */}
          <div className="flex items-center gap-4">
            <Button
              onClick={() => awardEarlyAdopterMutation.mutate()}
              disabled={awardEarlyAdopterMutation.isPending}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold px-6 py-2 rounded-xl transition-all disabled:opacity-50"
            >
              {awardEarlyAdopterMutation.isPending
                ? '處理中...'
                : '頒發 Early Adopter 徽章'}
            </Button>

            {awardResult && (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                  awardResult.success
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {awardResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span className="text-sm">{awardResult.message}</span>
                {awardResult.details && (
                  <span className="text-xs opacity-70">
                    (新頒發: {awardResult.details.awarded}, 已有:{' '}
                    {awardResult.details.alreadyHad}, 錯誤:{' '}
                    {awardResult.details.errors})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-sm text-blue-300">
              💡 此功能會自動找出前 100 位創建 proof 的用戶並頒發 Early
              Adopter 徽章。
              <br />
              This will automatically find the first 100 users who created
              proofs and award them the Early Adopter badge.
            </p>
          </div>
        </div>

        {/* All Badges Overview */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">所有徽章</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {badge.imageUrl ? (
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={badge.imageUrl}
                        alt={badge.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
                      <Award className="w-8 h-8 text-purple-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">
                      {badge.name}
                    </h3>
                    {badge.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                        {badge.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Users className="w-3 h-3 text-zinc-500" />
                      <span className="text-xs text-zinc-500">
                        {badge.awardCount} 位用戶擁有
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Awards */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6">最近頒發</h2>
          <div className="space-y-2">
            {recentAwards.length === 0 ? (
              <p className="text-zinc-400 text-center py-8">尚無頒發記錄</p>
            ) : (
              recentAwards.map((award, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Award className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {award.badgeName || 'Unknown Badge'}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {award.userName || 'Anonymous'} (
                        {award.walletAddress?.slice(0, 6)}...
                        {award.walletAddress?.slice(-4)})
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {award.awardedAt
                      ? new Date(award.awardedAt).toLocaleString('zh-TW')
                      : 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
