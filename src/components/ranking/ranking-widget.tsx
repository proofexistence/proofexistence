'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trophy, Heart, Eye, Clock } from 'lucide-react';

import { useRankings } from '@/hooks/use-rankings';
// Actually, I'll keep RankingType local if it's UI specific, but the data types come from the hook.

type RankingType = 'duration' | 'likes' | 'views';

export function RankingWidget() {
  const { data: rankings, isLoading: loading } = useRankings();
  const [activeTab, setActiveTab] = useState<RankingType>('likes');

  const tabs = [
    {
      key: 'likes' as RankingType,
      label: 'Most Liked',
      icon: Heart,
      color: 'from-red-500 to-pink-500',
      metric: 'likes',
    },
    {
      key: 'views' as RankingType,
      label: 'Most Viewed',
      icon: Eye,
      color: 'from-blue-500 to-cyan-500',
      metric: 'views',
    },
    {
      key: 'duration' as RankingType,
      label: 'Longest Trail',
      icon: Clock,
      color: 'from-purple-500 to-indigo-500',
      metric: 'duration',
    },
  ];

  const getDisplayData = () => {
    if (!rankings) return [];
    switch (activeTab) {
      case 'likes':
        return rankings.mostLiked;
      case 'views':
        return rankings.mostViewed;
      case 'duration':
        return rankings.topDuration;
      default:
        return [];
    }
  };

  const formatMetric = (value: number, type: RankingType) => {
    if (type === 'duration') {
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      return `${minutes}m ${seconds}s`;
    }
    return value.toLocaleString();
  };

  const truncateAddress = (address: string | null) => {
    if (!address) return 'Anonymous';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-bold text-white">Top Rankings</h2>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const displayData = getDisplayData();
  const activeTabData = tabs.find((tab) => tab.key === activeTab);

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h2 className="text-xl font-bold text-white">Top Rankings</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Ranking List */}
      <div className="space-y-2">
        {displayData.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No rankings available yet
          </div>
        ) : (
          displayData.map((entry, index) => (
            <Link
              key={entry.id}
              href={`/proof/${entry.id}`}
              className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 hover:border-white/20 transition-all group"
            >
              {/* Rank Badge */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0
                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black'
                    : index === 1
                      ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black'
                      : index === 2
                        ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black'
                        : 'bg-white/10 text-zinc-400'
                }`}
              >
                {index + 1}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate">
                  {entry.userName || truncateAddress(entry.walletAddress)}
                </div>
                {entry.message && (
                  <div className="text-xs text-zinc-500 truncate">
                    {entry.message}
                  </div>
                )}
              </div>

              {/* Metric Value */}
              <div className="flex-shrink-0 text-right">
                <div
                  className={`text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r ${activeTabData?.color}`}
                >
                  {formatMetric(entry[activeTab], activeTab)}
                </div>
                <div className="text-xs text-zinc-600">
                  {activeTab === 'duration' && 'duration'}
                  {activeTab === 'likes' && `${entry.likes} likes`}
                  {activeTab === 'views' && `${entry.views} views`}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
