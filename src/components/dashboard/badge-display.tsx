'use client';

import Image from 'next/image';
import { Info } from 'lucide-react';
import { useState } from 'react';

interface BadgeDisplayProps {
  userId?: string; // If provided, fetch server side (if server component) or assume passed data?
  // Let's assume this is a Server Component that is passed the Data, OR it fetches itself if ID provided?
  // Best pattern: generic display component receiving data props.
  badgesList?: {
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    awardedAt: Date | null;
  }[];
}

function BadgeCard({
  badge,
}: {
  badge: {
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
  };
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="group relative flex flex-col items-center justify-center">
      {/* Badge Icon - Clean and clear */}
      <div className="relative w-32 h-32 mb-4 flex items-center justify-center">
        {badge.imageUrl ? (
          <Image
            src={badge.imageUrl}
            alt={badge.name}
            width={128}
            height={128}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-6xl">🏅</span>
        )}
      </div>

      {/* Badge Name with Info Icon */}
      <div className="flex items-center gap-2">
        <h3 className="text-white font-bold text-base text-center">
          {badge.name}
        </h3>
        <div className="relative">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:text-purple-200 transition-all hover:scale-110"
            aria-label="Badge information"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-4 bg-black/98 backdrop-blur-xl border-2 border-purple-500/50 rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.5)] z-50 pointer-events-none">
              <div className="text-sm text-zinc-200 text-center leading-relaxed">
                {badge.description}
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5">
                <div className="border-[6px] border-transparent border-t-purple-500/50" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BadgeDisplay({ badgesList = [] }: BadgeDisplayProps) {
  if (badgesList.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 text-center">
        <p className="text-zinc-500 text-sm">
          No badges earned yet. Start creating!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
      {badgesList.map((badge) => (
        <BadgeCard key={badge.id} badge={badge} />
      ))}
    </div>
  );
}
