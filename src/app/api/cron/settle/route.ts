import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, dailySnapshots } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { generateMerkleTree } from '@/lib/merkle';
import { uploadToIrys } from '@/lib/irys';
import { ethers } from 'ethers';
import {
  PROOF_OF_EXISTENCE_ADDRESS,
  PROOF_OF_EXISTENCE_ABI,
} from '@/lib/contracts';
import { createAmoyProvider, waitForTransaction } from '@/lib/provider';

// Force dynamic to avoid caching
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Security Check - Vercel Cron uses Authorization: Bearer <CRON_SECRET>
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch Pending Sessions
    const pendingSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, 'PENDING'));

    if (pendingSessions.length === 0) {
      return NextResponse.json({ message: 'No pending sessions to settle' });
    }

    // 3. Generate Merkle Tree
    const treeSessions = pendingSessions.map((s) => ({
      sessionId: s.id,
      userId: s.userId,
      timestamp: s.startTime.getTime(),
      data: JSON.stringify(s.trailData), // Hash the trail data
    }));

    const tree = generateMerkleTree(treeSessions);
    const root = tree.getHexRoot();

    // 4. Upload Batch to Arweave (Irys)
    // We upload the full session details for archival
    // console.log('[Settle] Uploading to Irys...');
    const batchData = JSON.stringify(pendingSessions);
    const ipfsCid = await uploadToIrys(batchData, [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Batch-Size', value: pendingSessions.length.toString() },
      { name: 'Merkle-Root', value: root },
    ]);

    // 5. Submit to Blockchain
    // console.log('[Settle] Arweave ID:', ipfsCid);
    // console.log('[Settle] Creating provider and wallet...');

    // Use custom provider that works with Next.js 16 Turbopack
    const provider = createAmoyProvider();
    // Use OPERATOR_PRIVATE_KEY for batch settlement, fallback to PRIVATE_KEY
    const privateKey =
      process.env.OPERATOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error(
        'OPERATOR_PRIVATE_KEY or PRIVATE_KEY environment variable is not set'
      );
    }
    const wallet = new ethers.Wallet(privateKey, provider);

    // Get nonce and gas price
    const nonce = await provider.getTransactionCount(wallet.address, 'latest');
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? BigInt(0);
    const adjustedGasPrice = (gasPrice * BigInt(150)) / BigInt(100); // 50% buffer
    // console.log('[Settle] Nonce:', nonce);
    // console.log(
    //   '[Settle] Gas price:',
    //   ethers.formatUnits(adjustedGasPrice, 'gwei'),
    //   'gwei'
    // );

    const contract = new ethers.Contract(
      PROOF_OF_EXISTENCE_ADDRESS,
      PROOF_OF_EXISTENCE_ABI,
      wallet
    );

    // console.log('[Settle] Sending tx to contract:', PROOF_OF_EXISTENCE_ADDRESS);
    const tx = await contract.emitBatchProof(root, ipfsCid, {
      nonce,
      gasPrice: adjustedGasPrice,
      gasLimit: 200000,
    });
    // console.log('[Settle] TX hash:', tx.hash);

    // Use custom wait function (ethers' tx.wait() doesn't work in Next.js)
    await waitForTransaction(provider, tx.hash, 1, 120000);
    // console.log('[Settle] TX confirmed in block:', receipt.blockNumber);

    // 6. Update Database
    // Mark sessions as SETTLED with the batch settlement txHash
    const sessionIds = pendingSessions.map((s) => s.id);
    await db
      .update(sessions)
      .set({ status: 'SETTLED', txHash: tx.hash })
      .where(inArray(sessions.id, sessionIds));

    // Record Daily Snapshot
    const today = new Date().toISOString().split('T')[0];
    await db
      .insert(dailySnapshots)
      .values({
        dayId: today,
        merkleRoot: root,
        totalRewards: '0', // TODO: Implement reward calculation logic
        participantCount: pendingSessions.length,
        txHash: tx.hash,
      })
      .onConflictDoUpdate({
        target: dailySnapshots.dayId,
        set: {
          merkleRoot: root,
          participantCount: pendingSessions.length, // Logic might need adjustment if multiple batches per day
          txHash: tx.hash,
          createdAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      settledCount: pendingSessions.length,
      merkleRoot: root,
      arweaveId: ipfsCid,
      txHash: tx.hash,
    });
  } catch (error) {
    console.error('Settlement Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
