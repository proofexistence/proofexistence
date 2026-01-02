'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { ProfileView } from '@/components/dashboard/profile-view';
import { usePublicProfile } from '@/hooks/use-public-profile';
import { Loader2 } from 'lucide-react';

interface PageProps {
  params: Promise<{
    username: string;
  }>;
}

export default function ProfilePage({ params }: PageProps) {
  const { username } = use(params);
  const identifier = decodeURIComponent(username);

  const { profile, isLoading } = usePublicProfile(identifier);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-6 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!profile) {
    notFound();
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <ProfileView
        user={{
          id: profile.user.id,
          clerkId: profile.user.clerkId,
          name: profile.user.name,
          walletAddress: profile.user.walletAddress,
          avatarUrl: profile.user.avatarUrl,
          createdAt: new Date(profile.user.createdAt),
        }}
        createdProofs={profile.createdProofs
          .filter((p) => p.id !== null)
          .map((p) => ({
            ...p,
            createdAt: new Date(p.createdAt),
          }))}
        savedProofs={profile.savedProofs
          .filter((s) => s.id !== null)
          .map((s) => ({
            ...s,
            id: s.id!,
            createdAt: new Date(s.createdAt!),
            status: s.status!,
          }))}
        badges={profile.badges
          .filter((b) => b.id !== null)
          .map((b) => ({
            id: b.id!,
            name: b.name!,
            description: b.description!,
            imageUrl: b.imageUrl,
            awardedAt: b.awardedAt ? new Date(b.awardedAt) : null,
          }))}
      />
    </div>
  );
}
