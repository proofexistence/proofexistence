import { getProfile } from '@/lib/db/queries/get-profile';
import { NextRequest, NextResponse } from 'next/server';

interface PageProps {
  params: Promise<{
    identifier: string;
  }>;
}

export async function GET(req: NextRequest, { params }: PageProps) {
  try {
    const { identifier } = await params;
    console.log('[Profile API] Fetching profile for:', identifier);

    const profile = await getProfile(identifier);

    if (!profile) {
      console.log('[Profile API] Profile not found for:', identifier);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    console.log('[Profile API] Found profile:', {
      username: profile.user?.username,
      name: profile.user?.name,
      walletAddress: profile.user?.walletAddress,
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching profile API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
