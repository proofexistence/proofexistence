'use client';

import useSWR from 'swr';
import { useCallback, useState } from 'react';
import { useWeb3Auth } from '@/lib/web3auth/context';
import { ethers } from 'ethers';
import { PROOF_RECORDER_ADDRESS, PROOF_RECORDER_ABI } from '@/lib/contracts';

interface ClaimProofData {
  claimable: boolean;
  cumulativeAmount: string;
  cumulativeFormatted: string;
  alreadyClaimed: string;
  alreadyClaimedFormatted: string;
  claimableAmount: string;
  claimableFormatted: string;
  proof: string[];
  merkleRoot: string;
  onChainRoot: string;
  rootMatches: boolean;
  contractAddress: string;
  claimData: {
    cumulativeAmount: string;
    proof: string[];
  };
  reason?: string;
}

export function useClaimTime26() {
  const { user, isConnected, provider: web3Provider } = useWeb3Auth();
  const walletAddress = user?.walletAddress;
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);

  const fetcher = async (url: string) => {
    if (!walletAddress) return null;
    const res = await fetch(url, {
      headers: {
        'X-Wallet-Address': walletAddress,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch claim proof');
    return res.json();
  };

  const { data, error, isLoading, mutate } = useSWR<ClaimProofData>(
    isConnected && walletAddress ? '/api/user/claim-proof' : null,
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: true,
    }
  );

  const claimRewards = useCallback(async () => {
    if (!data?.claimable || !data?.claimData) {
      setClaimError('No claimable rewards available');
      return false;
    }

    setIsClaiming(true);
    setClaimError(null);
    setClaimTxHash(null);

    try {
      if (!web3Provider) {
        throw new Error('Wallet not connected');
      }

      const provider = new ethers.BrowserProvider(web3Provider);
      const signer = await provider.getSigner();

      const proofRecorder = new ethers.Contract(
        PROOF_RECORDER_ADDRESS,
        PROOF_RECORDER_ABI,
        signer
      );

      // Call claimRewards(cumulativeAmount, proof)
      const tx = await proofRecorder.claimRewards(
        data.claimData.cumulativeAmount,
        data.claimData.proof
      );

      setClaimTxHash(tx.hash);

      // Wait for confirmation
      await tx.wait();

      // Refresh the data
      await mutate();

      return true;
    } catch (err) {
      console.error('[ClaimTime26] Error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to claim rewards';
      setClaimError(errorMessage);
      return false;
    } finally {
      setIsClaiming(false);
    }
  }, [data, web3Provider, mutate]);

  return {
    // Claim status
    claimable: data?.claimable ?? false,
    claimableAmount: data?.claimableAmount ?? '0',
    claimableFormatted: data?.claimableFormatted ?? '0',
    alreadyClaimed: data?.alreadyClaimed ?? '0',
    alreadyClaimedFormatted: data?.alreadyClaimedFormatted ?? '0',
    rootMatches: data?.rootMatches ?? false,
    reason: data?.reason,

    // Loading states
    isLoading,
    isClaiming,
    isError: !!error,

    // Claim action
    claimRewards,
    claimError,
    claimTxHash,

    // Refresh
    refresh: mutate,
  };
}
