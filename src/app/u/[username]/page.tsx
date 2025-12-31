import { getProfile } from '@/lib/db/queries/get-profile';
import { notFound } from 'next/navigation';
import { ProfileView } from '@/components/dashboard/profile-view'; // Client component for tabs

interface PageProps {
  params: Promise<{
    username: string; // Dynamic route param
  }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  const decodedName = decodeURIComponent(username);
  return {
    title: `${decodedName} | Proof of Existence`,
    description: `Explore the digital legacy of ${decodedName}.`,
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  // Decode since URL might have %20 etc
  const identifier = decodeURIComponent(username);

  const profileData = await getProfile(identifier);

  if (!profileData) {
    notFound();
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <ProfileView
        user={profileData.user}
        createdProofs={profileData.createdProofs}
        savedProofs={
          profileData.savedProofs.filter(
            (s) => s.id !== null
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any
        } // Cast to any to avoid strict type mismatch from disparate DB types, we know it conforms at runtime mostly
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        badges={profileData.badges.filter((b) => b.id !== null) as any}
      />
    </div>
  );
}
