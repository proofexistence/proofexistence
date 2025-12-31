// import { getUserBadges } from '@/lib/db/queries/get-user-badges';
import Image from 'next/image';

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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {badgesList.map((badge) => (
        <div
          key={badge.id}
          className="group relative flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-900 border border-white/5 hover:border-purple-500/30 transition-all hover:bg-zinc-800"
        >
          <div className="w-16 h-16 mb-3 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(168,85,247,0.2)] group-hover:scale-110 transition-transform">
            {/* Placeholder Icon logic if no image */}
            {badge.imageUrl ? (
              <Image
                src={badge.imageUrl}
                alt={badge.name}
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
              />
            ) : (
              '🏅'
            )}
          </div>
          <h3 className="text-white font-bold text-sm text-center mb-1">
            {badge.name}
          </h3>
          <p className="text-zinc-500 text-xs text-center line-clamp-2">
            {badge.description}
          </p>

          {/* Tooltip or Detail on Hover could go here */}
        </div>
      ))}
    </div>
  );
}
