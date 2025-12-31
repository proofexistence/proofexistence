import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { openfort } from '@/lib/openfort';
import { ethers } from 'ethers';
import {
  PROOF_OF_EXISTENCE_ADDRESS,
  PROOF_OF_EXISTENCE_ABI,
  TIME26_ADDRESS,
  TIME26_ABI,
} from '@/lib/contracts';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { arweaveTxId, duration, paymentMethod, username, message } =
      await req.json();

    // 1. Get Clerk metadata (already verified via auth)
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const metadata = clerkUser.publicMetadata as {
      openfortPlayerId?: string;
      isExternalWallet?: boolean;
    };

    // 2. External wallet users must use client-side minting
    if (metadata.isExternalWallet) {
      return NextResponse.json(
        { error: 'External wallet users must mint via MetaMask (client-side)' },
        { status: 400 }
      );
    }

    // 3. Require Openfort player ID (created during signup)
    const playerId = metadata.openfortPlayerId;

    if (!playerId) {
      console.error(`[Mint] Missing openfortPlayerId for user ${userId}`);
      return NextResponse.json(
        { error: 'Wallet not initialized. Please sign out and sign in again.' },
        { status: 400 }
      );
    }

    // 2. Prepare Transaction
    const interactions = [];
    const chainId = process.env.NEXT_PUBLIC_IS_TESTNET === 'true' ? 80002 : 137;
    const isTestnet = chainId === 80002;

    // Create contract interface for encoding
    const poeInterface = new ethers.utils.Interface(PROOF_OF_EXISTENCE_ABI);
    const time26Interface = new ethers.utils.Interface(TIME26_ABI);

    if (paymentMethod === 'NATIVE') {
      let value: string;

      if (isTestnet) {
        // Testnet: use generous estimate (0.01 MATIC) - testnet MATIC is free
        value = ethers.utils.parseEther('0.01').toString();
      } else {
        // Mainnet: call contract for exact cost
        const rpcUrl =
          process.env.NEXT_PUBLIC_RPC_URL ||
          'https://polygon-bor-rpc.publicnode.com';
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(
          PROOF_OF_EXISTENCE_ADDRESS,
          PROOF_OF_EXISTENCE_ABI,
          provider
        );
        const cost = await contract.calculateCostNative(Math.floor(duration));
        value = cost.toString();
      }

      // Encode the function call
      const data = poeInterface.encodeFunctionData('mintEternalNative', [
        Math.floor(duration),
        'ar://' + arweaveTxId,
        username,
        message || '',
      ]);

      interactions.push({
        to: PROOF_OF_EXISTENCE_ADDRESS,
        value: value,
        data: data,
      });
    } else {
      // TIME26 logic (Approve + Mint)
      const approveData = time26Interface.encodeFunctionData('approve', [
        PROOF_OF_EXISTENCE_ADDRESS,
        ethers.constants.MaxUint256,
      ]);

      interactions.push({
        to: TIME26_ADDRESS,
        data: approveData,
      });

      const mintData = poeInterface.encodeFunctionData('mintEternalTime26', [
        Math.floor(duration),
        'ar://' + arweaveTxId,
        username,
        message || '',
      ]);

      interactions.push({
        to: PROOF_OF_EXISTENCE_ADDRESS,
        data: mintData,
      });
    }

    // 3. Send to Openfort
    const policyId = process.env.OPENFORT_POLICY_ID;

    const tx = await openfort.transactionIntents.create({
      player: playerId,
      chainId,
      policy: policyId,
      optimistic: true,
      interactions,
    });

    return NextResponse.json({
      txHash: tx.response?.transactionHash || tx.id,
      status: 'submitted',
    });
  } catch (err: unknown) {
    console.error('Mint API Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
