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

    // Get viewer's wallet address from header (set by client if logged in)
    const viewerWalletAddress =
      req.headers.get('X-Wallet-Address') || undefined;

    const profile = await getProfile(identifier, viewerWalletAddress);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
