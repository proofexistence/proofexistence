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
    const { searchParams } = new URL(req.url);

    // Get viewer's wallet address from header (set by client if logged in)
    const viewerWalletAddress =
      req.headers.get('X-Wallet-Address') || undefined;

    // Pagination params
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const profile = await getProfile(identifier, viewerWalletAddress, {
      limit: Math.min(limit, 50), // Max 50 per request
      offset,
    });

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
