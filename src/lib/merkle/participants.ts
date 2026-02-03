// src/lib/merkle/participants.ts

import { MerkleTree } from 'merkletreejs';
import { keccak256, solidityPackedKeccak256 } from 'ethers';

/**
 * Generate a Merkle tree from participant wallet addresses
 * Used for verifying free mint eligibility
 */
export function generateParticipantsMerkleTree(walletAddresses: string[]): {
  tree: MerkleTree;
  root: string;
  leaves: Buffer[];
} {
  // Normalize addresses to lowercase
  const normalizedAddresses = walletAddresses.map((addr) => addr.toLowerCase());

  // Remove duplicates
  const uniqueAddresses = [...new Set(normalizedAddresses)];

  // Generate leaves: keccak256(abi.encodePacked(address))
  const leaves = uniqueAddresses.map((addr) => {
    const hash = solidityPackedKeccak256(['address'], [addr]);
    return Buffer.from(hash.slice(2), 'hex');
  });

  // Create tree with sorted pairs for determinism
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

  return {
    tree,
    root: tree.getHexRoot(),
    leaves,
  };
}

/**
 * Get Merkle proof for a specific wallet address
 */
export function getParticipantProof(
  tree: MerkleTree,
  walletAddress: string
): string[] {
  const normalizedAddress = walletAddress.toLowerCase();
  const hash = solidityPackedKeccak256(['address'], [normalizedAddress]);
  const leaf = Buffer.from(hash.slice(2), 'hex');

  return tree.getHexProof(leaf);
}

/**
 * Verify a wallet address is in the Merkle tree
 */
export function verifyParticipant(
  tree: MerkleTree,
  walletAddress: string,
  root: string
): boolean {
  const normalizedAddress = walletAddress.toLowerCase();
  const hash = solidityPackedKeccak256(['address'], [normalizedAddress]);
  const leaf = Buffer.from(hash.slice(2), 'hex');

  return tree.verify(tree.getHexProof(leaf), leaf, root);
}
