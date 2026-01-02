import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { checkRateLimit } from '@/lib/ratelimit';
import { z } from 'zod';

/**
 * Mint API - Validates minting requests
 *
 * With Web3Auth, actual minting happens client-side via the user's wallet.
 * This endpoint validates the request and performs rate limiting.
 */

// Validation Schema
const MintRequestSchema = z.object({
  arweaveTxId: z.string().min(40, 'Invalid Arweave Transaction ID'),
  duration: z.number().int().min(10, 'Duration must be at least 10 seconds'),
  paymentMethod: z.enum(['NATIVE', 'TIME26']),
  username: z.string().min(1).max(30).optional().or(z.literal('')),
  message: z.string().max(280).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate Limiting
    const rateLimit = await checkRateLimit(`mint:${user.walletAddress}`);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse Body
    const body = await req.json();

    // Input Validation
    const validation = MintRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      );
    }

    // With Web3Auth, users mint directly from client-side using their wallet
    // This endpoint only validates the request - actual minting happens client-side
    return NextResponse.json({
      status: 'validated',
      message:
        'Request validated. Please sign the transaction in your wallet to complete minting.',
      walletAddress: user.walletAddress,
    });
  } catch (err: unknown) {
    console.error('Mint API Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
