import { NextRequest, NextResponse } from 'next/server';
import { ARWEAVE_GATEWAY } from '@/lib/arweave-gateway';

const TX_ID_REGEX = /^[a-zA-Z0-9_-]{43}$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ txId: string }> }
) {
  const { txId } = await params;

  if (!TX_ID_REGEX.test(txId)) {
    return NextResponse.json({ error: 'Invalid txId' }, { status: 400 });
  }

  try {
    const res = await fetch(`${ARWEAVE_GATEWAY}/${txId}`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || '';

    // JSON metadata - proxy as-is
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      });
    }

    // Image - stream through
    const buffer = new Uint8Array(await res.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[arweave proxy] Error fetching:', txId, error);
    return new NextResponse(null, { status: 502 });
  }
}
