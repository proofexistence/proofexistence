import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ethers } from 'ethers';
import { createProvider } from '@/lib/provider';
import { PROOF_RECORDER_ADDRESS, PROOF_RECORDER_ABI } from '@/lib/contracts';
import { getQuickGasEstimate } from '@/lib/gas/estimate';
import {
  checkGaslessEligibility,
  getPricingConfig,
  fetchPolPrice,
} from '@/lib/pricing/time26-oracle';

/**
 * GET /api/mint/gasless/eligibility
 *
 * Check if user is eligible for gasless minting with unclaimed TIME26 balance.
 *
 * Query params:
 * - duration: number (required) - Duration in seconds
 *
 * Returns eligibility status and cost breakdown.
 */
export async function GET(req: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse duration from query
    const searchParams = req.nextUrl.searchParams;
    const durationParam = searchParams.get('duration');

    if (!durationParam) {
      return NextResponse.json(
        { error: 'Missing duration parameter' },
        { status: 400 }
      );
    }

    const duration = parseInt(durationParam, 10);
    if (isNaN(duration) || duration < 10) {
      return NextResponse.json(
        { error: 'Duration must be at least 10 seconds' },
        { status: 400 }
      );
    }

    // Get user's unclaimed TIME26 balance from database
    const [dbUser] = await db
      .select({
        time26Balance: users.time26Balance,
      })
      .from(users)
      .where(eq(users.id, user.id));

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const unclaimedBalance = BigInt(dbUser.time26Balance || '0');

    // Get mint cost in TIME26 from contract
    const provider = createProvider();
    const contract = new ethers.Contract(
      PROOF_RECORDER_ADDRESS,
      PROOF_RECORDER_ABI,
      provider
    );

    const mintCostTime26 = await contract.calculateCostTime26(
      Math.floor(duration)
    );

    // Get gas estimate
    const gasEstimate = await getQuickGasEstimate();

    // Fetch real-time POL price (cached for 5 min)
    await fetchPolPrice();

    // Check eligibility
    const eligibility = checkGaslessEligibility(
      unclaimedBalance,
      BigInt(mintCostTime26.toString()),
      gasEstimate.totalCostWei
    );

    // Get pricing config for transparency
    const pricingConfig = getPricingConfig();

    return NextResponse.json({
      eligible: eligibility.eligible,
      unclaimedBalance: eligibility.unclaimedBalance.toString(),
      unclaimedFormatted: eligibility.unclaimedFormatted,
      mintCostTime26: eligibility.mintCostTime26.toString(),
      mintCostFormatted: eligibility.mintCostFormatted,
      gasCostTime26: eligibility.gasCostTime26.toString(),
      gasCostFormatted: eligibility.gasCostFormatted,
      totalCostTime26: eligibility.totalCostTime26.toString(),
      totalCostFormatted: eligibility.totalCostFormatted,
      shortfall: eligibility.shortfall?.toString(),
      reason: eligibility.reason,
      // Additional info
      gasEstimatePol: gasEstimate.totalCostPol,
      pricing: pricingConfig,
      duration,
    });
  } catch (err: unknown) {
    console.error('[Gasless Eligibility] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
