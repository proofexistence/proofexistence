/**
 * User Claim Proof API
 *
 * GET - Returns the Merkle proof for claiming TIME26 rewards
 *
 * The proof allows users to claim their off-chain balance to their wallet
 * by calling ProofRecorder.claimRewards(cumulativeAmount, proof)
 *
 * IMPORTANT: Uses stored Merkle snapshot from when the root was set on-chain,
 * not current DB balances. This ensures the proof matches the on-chain root.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { rewardsMerkleSnapshots } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  generateRewardsMerkleTree,
  getRewardProof,
  type UserRewardEntry,
} from '@/lib/merkle/rewards';
import { PROOF_RECORDER_ADDRESS } from '@/lib/contracts';
import { formatTime26 } from '@/lib/rewards/calculate';
import { ethers } from 'ethers';
import { createPolygonProvider } from '@/lib/provider';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch on-chain data first
    let alreadyClaimed = '0';
    let onChainRoot = '0x' + '0'.repeat(64);
    try {
      const provider = createPolygonProvider();
      const proofRecorder = new ethers.Contract(
        PROOF_RECORDER_ADDRESS,
        [
          'function totalClaimed(address) view returns (uint256)',
          'function rewardsMerkleRoot() view returns (bytes32)',
        ],
        provider
      );
      const claimed = await proofRecorder.totalClaimed(user.walletAddress);
      alreadyClaimed = claimed.toString();
      onChainRoot = await proofRecorder.rewardsMerkleRoot();
    } catch (err) {
      console.warn('[ClaimProof] Error fetching on-chain data:', err);
      return NextResponse.json({
        claimable: false,
        reason: 'Failed to fetch on-chain data',
        claimableFormatted: '0',
      });
    }

    // 2. Find the snapshot matching the on-chain root
    const snapshot = await db
      .select()
      .from(rewardsMerkleSnapshots)
      .where(eq(rewardsMerkleSnapshots.merkleRoot, onChainRoot))
      .limit(1);

    if (snapshot.length === 0) {
      // No matching snapshot - might be first time or root was set externally
      // Try to find the latest snapshot as fallback info
      const latestSnapshot = await db
        .select()
        .from(rewardsMerkleSnapshots)
        .orderBy(desc(rewardsMerkleSnapshots.createdAt))
        .limit(1);

      return NextResponse.json({
        claimable: false,
        reason: 'No matching merkle snapshot found. Rewards sync pending.',
        onChainRoot,
        latestSnapshotRoot: latestSnapshot[0]?.merkleRoot || null,
        claimableFormatted: '0',
      });
    }

    // 3. Find user's entry in the snapshot
    const userAddress = user.walletAddress.toLowerCase();
    const entries = snapshot[0].entries as UserRewardEntry[];
    const userEntry = entries.find(
      (e) => e.walletAddress.toLowerCase() === userAddress
    );

    if (!userEntry) {
      return NextResponse.json({
        claimable: false,
        reason: 'No balance in current merkle tree',
        claimableFormatted: '0',
        onChainRoot,
      });
    }

    // 4. Regenerate tree from snapshot entries to get proof
    const tree = generateRewardsMerkleTree(entries);
    const proof = getRewardProof(tree, userEntry);

    // 5. Calculate claimable amount
    const cumulativeAmount = BigInt(userEntry.cumulativeAmount);
    const claimed = BigInt(alreadyClaimed);
    const claimableAmount =
      cumulativeAmount > claimed ? cumulativeAmount - claimed : BigInt(0);

    return NextResponse.json({
      claimable: claimableAmount > 0,
      cumulativeAmount: userEntry.cumulativeAmount,
      cumulativeFormatted: formatTime26(userEntry.cumulativeAmount),
      alreadyClaimed,
      alreadyClaimedFormatted: formatTime26(alreadyClaimed),
      claimableAmount: claimableAmount.toString(),
      claimableFormatted: formatTime26(claimableAmount.toString()),
      proof,
      merkleRoot: onChainRoot,
      onChainRoot,
      rootMatches: true, // Always true now since we use the on-chain root's snapshot
      contractAddress: PROOF_RECORDER_ADDRESS,
      // Data needed to call claimRewards(cumulativeAmount, proof)
      claimData: {
        cumulativeAmount: userEntry.cumulativeAmount,
        proof,
      },
    });
  } catch (error) {
    console.error('[ClaimProof API] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
