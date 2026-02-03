import { NextResponse } from 'next/server';
import { db } from '@/db';
import { daisyMints, daisyMintClaims, sessions, users } from '@/db/schema';
import { eq, and, between, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/get-user';
import { checkRateLimit } from '@/lib/ratelimit';
import {
  generateParticipantsMerkleTree,
  getParticipantProof,
} from '@/lib/merkle/participants';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // 1. Auth check
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!user.walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address required' },
      { status: 400 }
    );
  }

  // 2. Rate limit
  const { success: rateLimitOk } = await checkRateLimit(user.walletAddress);
  if (!rateLimitOk) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { date } = body;

    // Validate date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Get daisy mint
    const [daisyMint] = await db
      .select()
      .from(daisyMints)
      .where(eq(daisyMints.date, date))
      .limit(1);

    if (!daisyMint) {
      return NextResponse.json(
        { error: 'No Daisy NFT for this date' },
        { status: 404 }
      );
    }

    if (daisyMint.status !== 'active') {
      return NextResponse.json(
        { error: 'Minting not active' },
        { status: 400 }
      );
    }

    // Check if already claimed
    const [existingClaim] = await db
      .select()
      .from(daisyMintClaims)
      .where(
        and(
          eq(daisyMintClaims.daisyMintId, daisyMint.id),
          eq(daisyMintClaims.userId, user.id),
          eq(daisyMintClaims.isFreeParticipant, true)
        )
      )
      .limit(1);

    if (existingClaim) {
      return NextResponse.json({ error: 'Already claimed' }, { status: 400 });
    }

    // Verify user was a participant
    const startOfDay = new Date(date + 'T00:00:00Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    const [userSession] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, user.id),
          between(sessions.createdAt, startOfDay, endOfDay)
        )
      )
      .limit(1);

    if (!userSession) {
      return NextResponse.json(
        { error: 'Not a participant on this date' },
        { status: 403 }
      );
    }

    // Get all participants for the day and generate Merkle proof
    const participants = await db
      .select({ walletAddress: users.walletAddress })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(between(sessions.createdAt, startOfDay, endOfDay))
      .groupBy(users.walletAddress);

    const walletAddresses = participants
      .map((p) => p.walletAddress)
      .filter((addr): addr is string => addr !== null);

    const { tree, root } = generateParticipantsMerkleTree(walletAddresses);
    const proof = getParticipantProof(tree, user.walletAddress);

    // Record the claim
    const [claim] = await db
      .insert(daisyMintClaims)
      .values({
        daisyMintId: daisyMint.id,
        userId: user.id,
        walletAddress: user.walletAddress,
        edition: 'standard',
        isFreeParticipant: true,
        paidAmount: '0',
        paymentToken: 'FREE',
      })
      .returning();

    // Increment mint count
    await db
      .update(daisyMints)
      .set({
        standardMintCount: sql`${daisyMints.standardMintCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(daisyMints.id, daisyMint.id));

    return NextResponse.json({
      success: true,
      claimId: claim.id,
      merkleProof: proof,
      merkleRoot: root,
      contractParams: {
        date: parseInt(date.replace(/-/g, '')), // YYYYMMDD
        proof,
      },
    });
  } catch (error) {
    console.error('Error claiming free mint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
