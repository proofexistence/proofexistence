'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface BadgeInfo {
  id: string;
  imageUrl: string;
  colorClass: string;
}

const BADGES: BadgeInfo[] = [
  {
    id: 'early-adopter-top-100',
    imageUrl: '/badges/early-adopter.svg',
    colorClass: 'from-yellow-400 to-yellow-600',
  },
  {
    id: 'marathon-artist',
    imageUrl: '/badges/marathon-artist.svg',
    colorClass: 'from-purple-500 to-purple-700',
  },
  {
    id: 'prolific-creator',
    imageUrl: '/badges/prolific-creator.svg',
    colorClass: 'from-green-400 to-green-600',
  },
  {
    id: 'streak-master',
    imageUrl: '/badges/streak-master.svg',
    colorClass: 'from-orange-400 to-orange-600',
  },
  {
    id: 'most-liked',
    imageUrl: '/badges/most-liked.svg',
    colorClass: 'from-pink-400 to-pink-600',
  },
  {
    id: 'collection-star',
    imageUrl: '/badges/collection-star.svg',
    colorClass: 'from-violet-400 to-violet-600',
  },
  {
    id: 'generous-giver',
    imageUrl: '/badges/generous-giver.svg',
    colorClass: 'from-blue-400 to-blue-600',
  },
  {
    id: 'reward-collector',
    imageUrl: '/badges/reward-collector.svg',
    colorClass: 'from-amber-400 to-amber-600',
  },
  {
    id: 'referral-ambassador',
    imageUrl: '/badges/referral-ambassador.svg',
    colorClass: 'from-cyan-400 to-cyan-600',
  },
  {
    id: 'distance-explorer',
    imageUrl: '/badges/distance-explorer.svg',
    colorClass: 'from-teal-400 to-teal-600',
  },
  {
    id: 'speed-demon',
    imageUrl: '/badges/speed-demon.svg',
    colorClass: 'from-red-400 to-red-600',
  },
];

export function BadgesShowcase() {
  const t = useTranslations('badges');
  const tPage = useTranslations('badgesPage');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 pt-24 md:pt-32">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            {tPage('title')}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {tPage('description')}
          </p>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {BADGES.map((badge) => (
            <div
              key={badge.id}
              className="group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-1"
            >
              {/* Badge Icon */}
              <div className="flex justify-center mb-6">
                <div
                  className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${badge.colorClass} p-1 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center p-2">
                    <Image
                      src={badge.imageUrl}
                      alt={t(`${badge.id}.name`)}
                      width={120}
                      height={120}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Badge Info */}
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-purple-300 transition-colors">
                  {t(`${badge.id}.name`)}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {t(`${badge.id}.description`)}
                </p>
              </div>

              {/* Hover Effect Glow */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${badge.colorClass} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-300 -z-10`}
              />
            </div>
          ))}
        </div>

        {/* How to Earn Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
            <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {tPage('howToEarn.title')}
            </h2>
            <div className="space-y-4 text-gray-300">
              <p className="text-lg leading-relaxed">
                {tPage('howToEarn.description')}
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>{tPage('howToEarn.tip1')}</li>
                <li>{tPage('howToEarn.tip2')}</li>
                <li>{tPage('howToEarn.tip3')}</li>
                <li>{tPage('howToEarn.tip4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
