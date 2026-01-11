import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { checkRateLimit } from '@/lib/ratelimit';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { ethers } from 'ethers';
import { z } from 'zod';
import { createProvider, waitForTransaction } from '@/lib/provider';
import { PROOF_RECORDER_ADDRESS, PROOF_RECORDER_ABI } from '@/lib/contracts';
import { estimateMintGas } from '@/lib/gas/estimate';
import {
  checkGaslessEligibility,
  convertPolToTime26,
  fetchPolPrice,
} from '@/lib/pricing/time26-oracle';

/**
 * POST /api/mint/gasless
 *
 * Gasless minting using unclaimed TIME26 balance.
 * Operator wallet sponsors the gas, user's off-chain balance is deducted.
 * Both mint fee and gas fee equivalent go to burn.
 */

// Validation Schema
const GaslessMintRequestSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  metadataURI: z.string().min(1, 'Metadata URI required'),
  displayName: z.string().min(1).max(30).default('Anonymous'),
  message: z.string().max(280).default(''),
  duration: z.number().int().min(10, 'Duration must be at least 10 seconds'),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit (stricter tier for gasless)
    const rateLimit = await checkRateLimit(
      `gasless:${user.walletAddress}`,
      'gasless'
    );
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many gasless mint requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 3. Parse and validate request
    const body = await req.json();
    const validation = GaslessMintRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { sessionId, metadataURI, displayName, message, duration } =
      validation.data;

    // 4. Verify session ownership and status
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to mint this session' },
        { status: 403 }
      );
    }

    if (session.status === 'MINTED') {
      return NextResponse.json(
        { error: 'Session already minted' },
        { status: 400 }
      );
    }

    // 5. Get user's unclaimed TIME26 balance
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

    // 6. Get mint cost from contract
    const provider = createProvider();
    const contract = new ethers.Contract(
      PROOF_RECORDER_ADDRESS,
      PROOF_RECORDER_ABI,
      provider
    );

    const mintCostTime26 = BigInt(
      (await contract.calculateCostTime26(Math.floor(duration))).toString()
    );

    // 7. Estimate gas and convert to TIME26
    const gasEstimate = await estimateMintGas(
      duration,
      metadataURI,
      displayName,
      message,
      user.walletAddress
    );

    // Fetch real-time POL price before conversion
    await fetchPolPrice();
    const gasCostTime26 = convertPolToTime26(gasEstimate.totalCostWei);

    // 8. Check eligibility
    const eligibility = checkGaslessEligibility(
      unclaimedBalance,
      mintCostTime26,
      gasEstimate.totalCostWei
    );

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: 'Not eligible for gasless minting',
          required: eligibility.totalCostTime26.toString(),
          available: unclaimedBalance.toString(),
          shortfall: eligibility.shortfall?.toString(),
        },
        { status: 400 }
      );
    }

    // Total cost to deduct (mint + gas) - BOTH go to burn
    const totalCostTime26 = mintCostTime26 + gasCostTime26;

    // 9. Deduct balance atomically (both mint fee + gas fee go to pendingBurn)
    // Use atomic UPDATE with WHERE clause instead of transaction (neon-http doesn't support transactions)
    const updateResult = await db
      .update(users)
      .set({
        time26Balance: sql`${users.time26Balance} - ${totalCostTime26.toString()}::numeric`,
        time26PendingBurn: sql`${users.time26PendingBurn} + ${totalCostTime26.toString()}::numeric`,
      })
      .where(
        and(
          eq(users.id, user.id),
          sql`${users.time26Balance} >= ${totalCostTime26.toString()}::numeric`
        )
      )
      .returning({ id: users.id });

    if (updateResult.length === 0) {
      return NextResponse.json(
        { error: 'Insufficient balance or balance changed' },
        { status: 400 }
      );
    }

    // 10. Execute mint with operator wallet
    const operatorPrivateKey = process.env.OPERATOR_PRIVATE_KEY;
    if (!operatorPrivateKey) {
      // Rollback balance on config error
      await rollbackBalance(user.id, totalCostTime26);
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const operatorWallet = new ethers.Wallet(operatorPrivateKey, provider);
    const contractWithSigner = new ethers.Contract(
      PROOF_RECORDER_ADDRESS,
      PROOF_RECORDER_ABI,
      operatorWallet
    );

    let txHash: string;
    let tokenId: string | null = null;

    try {
      // Get nonce and gas price
      const nonce = await provider.getTransactionCount(
        operatorWallet.address,
        'latest'
      );

      // Call mintSponsoredNative
      const tx = await contractWithSigner.mintSponsoredNative(
        Math.floor(duration),
        metadataURI,
        displayName,
        message,
        user.walletAddress,
        {
          nonce,
          gasLimit: gasEstimate.gasLimit,
          gasPrice: gasEstimate.gasPrice,
        }
      );

      txHash = tx.hash;

      // Wait for confirmation
      const receipt = await waitForTransaction(provider, txHash, 1, 120000);

      // Extract tokenId from event logs
      tokenId = extractTokenIdFromReceipt(receipt);
    } catch (mintError) {
      console.error('[Gasless Mint] Transaction failed:', mintError);

      // Rollback balance deduction on mint failure
      await rollbackBalance(user.id, totalCostTime26);

      return NextResponse.json(
        {
          error: 'Mint transaction failed',
          details:
            mintError instanceof Error ? mintError.message : String(mintError),
        },
        { status: 500 }
      );
    }

    // 11. Update session status
    await db
      .update(sessions)
      .set({
        status: 'MINTED',
        txHash,
      })
      .where(eq(sessions.id, sessionId));

    // 12. Return success
    return NextResponse.json({
      success: true,
      txHash,
      tokenId,
      balanceDeducted: totalCostTime26.toString(),
      mintCost: mintCostTime26.toString(),
      gasCost: gasCostTime26.toString(),
    });
  } catch (err: unknown) {
    console.error('[Gasless Mint] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * Rollback balance deduction on failure with retry
 */
async function rollbackBalance(
  userId: string,
  amount: bigint,
  maxRetries = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await db
        .update(users)
        .set({
          time26Balance: sql`${users.time26Balance} + ${amount.toString()}::numeric`,
          time26PendingBurn: sql`${users.time26PendingBurn} - ${amount.toString()}::numeric`,
        })
        .where(eq(users.id, userId))
        .returning({ id: users.id });

      if (result.length > 0) {
        return true;
      }
    } catch (error) {
      console.error(
        `[Gasless Mint] Rollback attempt ${attempt}/${maxRetries} failed:`,
        error
      );
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  // Critical: All retries failed
  console.error(
    `[Gasless Mint] CRITICAL: Failed to rollback ${amount.toString()} for user ${userId} after ${maxRetries} attempts`
  );
  return false;
}

/**
 * Extract tokenId from transaction receipt events
 */
function extractTokenIdFromReceipt(
  receipt: ethers.TransactionReceipt
): string | null {
  try {
    // Look for ExistenceMinted event
    const iface = new ethers.Interface(PROOF_RECORDER_ABI);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });

        if (parsed?.name === 'ExistenceMinted') {
          // ExistenceMinted(uint256 indexed id, address indexed owner, ...)
          return parsed.args[0].toString();
        }
      } catch {
        // Skip logs that don't match our ABI
      }
    }
  } catch (error) {
    console.error('[Gasless Mint] Failed to extract tokenId:', error);
  }

  return null;
}
