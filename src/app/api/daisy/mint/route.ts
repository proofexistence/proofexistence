import { NextResponse } from 'next/server';
import { db } from '@/db';
import { daisyMints, daisyMintClaims, sessions } from '@/db/schema';
import { eq, and, between } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/get-user';
import { calculateStandardPrice, GENESIS_AUCTION } from '@/lib/daisy/pricing';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  // Validate date format
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  try {
    // Get daisy mint info from DB
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

    // Calculate current price
    const priceResult = calculateStandardPrice(
      date,
      daisyMint.participantCount || 0,
      null // Phase 1: no time limit
    );

    // Check user eligibility
    const user = await getCurrentUser();
    let userInfo = null;

    if (user) {
      // Check if user already claimed/minted
      const existingClaims = await db
        .select()
        .from(daisyMintClaims)
        .where(
          and(
            eq(daisyMintClaims.daisyMintId, daisyMint.id),
            eq(daisyMintClaims.userId, user.id)
          )
        );

      const freeClaim = existingClaims.find((c) => c.isFreeParticipant);
      const paidClaim = existingClaims.find((c) => !c.isFreeParticipant);

      // Check if user was a participant on that date
      let canClaimFree = false;
      if (!freeClaim && daisyMint.participantsMerkleRoot) {
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

        canClaimFree = !!userSession;
      }

      userInfo = {
        canClaimFree,
        hasClaimed: !!freeClaim,
        hasMinted: !!paidClaim,
        merkleProof: [], // Will be generated when claiming
      };
    }

    return NextResponse.json({
      date,
      status: daisyMint.status,

      genesis: {
        tokenId: daisyMint.genesisTokenId,
        arweaveHash: daisyMint.genesisArweaveHash,
        auctionStartPrice: GENESIS_AUCTION.START_PRICE,
        currentBid: daisyMint.auctionCurrentBid,
        highestBidder: daisyMint.auctionHighestBidder,
        endTime: daisyMint.auctionEndTime?.toISOString() || null,
        settled: daisyMint.auctionSettled,
        mintedTo: daisyMint.genesisMintedTo,
      },

      standard: {
        arweaveHash: daisyMint.standardArweaveHash,
        mintCount: daisyMint.standardMintCount,
        currentPrice: priceResult.finalPrice,
        priceFactors: priceResult.factors,
      },

      theme: daisyMint.theme,
      dominantColor: daisyMint.dominantColor,
      previewUrl: daisyMint.previewUrl,
      participantCount: daisyMint.participantCount,
      sessionCount: daisyMint.sessionCount,
      isSpecialDay: daisyMint.isSpecialDay,
      specialDayName: daisyMint.specialDayName,

      user: userInfo,
    });
  } catch (error) {
    console.error('Error fetching daisy mint info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
