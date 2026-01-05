/**
 * User Claim Proof API
 *
 * GET - Returns the Merkle proof for claiming TIME26 rewards
 *
 * The proof allows users to claim their off-chain balance to their wallet
 * by calling ProofRecorder.claimRewards(cumulativeAmount, proof)
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/db';
import { users } from '@/db/schema';
import { gt } from 'drizzle-orm';
import {
  generateRewardsMerkleTree,
  getRewardProof,
  getRewardsRoot,
  type UserRewardEntry,
} from '@/lib/merkle/rewards';
import { PROOF_RECORDER_ADDRESS } from '@/lib/contracts';
import { formatTime26 } from '@/lib/rewards/calculate';
import { ethers } from 'ethers';
import { createPolygonProvider } from '@/lib/provider';

export const dynamic = 'force-dynamic';

// Cache the merkle tree for 5 minutes to avoid regenerating on every request
let cachedTree: {
  tree: ReturnType<typeof generateRewardsMerkleTree>;
  entries: Map<string, UserRewardEntry>;
  root: string;
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getOrGenerateMerkleTree() {
  const now = Date.now();

  // Return cached tree if still valid
  if (cachedTree && now - cachedTree.timestamp < CACHE_TTL) {
    return cachedTree;
  }

  // Fetch all users with positive balance
  const usersWithBalance = await db
    .select({
      walletAddress: users.walletAddress,
      time26Balance: users.time26Balance,
    })
    .from(users)
    .where(gt(users.time26Balance, '0'));

  if (usersWithBalance.length === 0) {
    return null;
  }

  // Create entries for merkle tree
  const entries: UserRewardEntry[] = usersWithBalance.map((u) => ({
    walletAddress: u.walletAddress.toLowerCase(), // Normalize to lowercase
    cumulativeAmount: u.time26Balance,
  }));

  // Create lookup map
  const entriesMap = new Map<string, UserRewardEntry>();
  entries.forEach((e) => entriesMap.set(e.walletAddress.toLowerCase(), e));

  // Generate tree
  const tree = generateRewardsMerkleTree(entries);
  const root = getRewardsRoot(tree);

  // Cache it
  cachedTree = {
    tree,
    entries: entriesMap,
    root,
    timestamp: now,
  };

  return cachedTree;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the merkle tree
    const treeData = await getOrGenerateMerkleTree();
    if (!treeData) {
      return NextResponse.json({
        claimable: false,
        reason: 'No users with rewards',
        balance: '0',
      });
    }

    // Find user's entry
    const userAddress = user.walletAddress.toLowerCase();
    const userEntry = treeData.entries.get(userAddress);

    if (!userEntry) {
      return NextResponse.json({
        claimable: false,
        reason: 'No balance to claim',
        balance: '0',
      });
    }

    // Get proof
    const proof = getRewardProof(treeData.tree, userEntry);

    // Check on-chain claimed amount
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
    }

    // Calculate claimable
    const cumulativeAmount = BigInt(userEntry.cumulativeAmount);
    const claimed = BigInt(alreadyClaimed);
    const claimableAmount = cumulativeAmount > claimed ? cumulativeAmount - claimed : BigInt(0);

    // Check if merkle root matches on-chain
    const rootMatches = treeData.root.toLowerCase() === onChainRoot.toLowerCase();

    return NextResponse.json({
      claimable: claimableAmount > 0 && rootMatches,
      cumulativeAmount: userEntry.cumulativeAmount,
      cumulativeFormatted: formatTime26(userEntry.cumulativeAmount),
      alreadyClaimed,
      alreadyClaimedFormatted: formatTime26(alreadyClaimed),
      claimableAmount: claimableAmount.toString(),
      claimableFormatted: formatTime26(claimableAmount.toString()),
      proof,
      merkleRoot: treeData.root,
      onChainRoot,
      rootMatches,
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
