/**
 * Rewards Merkle Tree Utilities
 *
 * Generates Merkle trees for TIME26 reward claiming.
 * Must match the contract's verification logic:
 *   bytes32 leaf = keccak256(abi.encodePacked(msg.sender, cumulativeAmount));
 */

import { MerkleTree } from 'merkletreejs';
import { ethers } from 'ethers';

export interface UserRewardEntry {
  walletAddress: string;
  cumulativeAmount: string; // in wei (as string for bigint safety)
}

/**
 * Generates a leaf node for the rewards Merkle Tree
 * Must match: keccak256(abi.encodePacked(address, uint256))
 */
export function generateRewardLeaf(entry: UserRewardEntry): Buffer {
  // abi.encodePacked(address, uint256) = 20 bytes + 32 bytes = 52 bytes
  const packed = ethers.solidityPacked(
    ['address', 'uint256'],
    [entry.walletAddress, entry.cumulativeAmount]
  );
  // Use ethers keccak256 then convert to Buffer
  const hash = ethers.keccak256(packed);
  return Buffer.from(hash.slice(2), 'hex');
}

/**
 * Generates the Merkle Tree from all user balances
 */
export function generateRewardsMerkleTree(
  entries: UserRewardEntry[]
): MerkleTree {
  if (entries.length === 0) {
    throw new Error('Cannot create Merkle tree with no entries');
  }

  const leaves = entries.map((e) => generateRewardLeaf(e));
  // Sort pairs for determinism (matches contract's comparison logic)
  return new MerkleTree(leaves, ethers.keccak256, {
    sortPairs: true,
    hashLeaves: false, // We already hashed the leaves
  });
}

/**
 * Gets the Merkle proof for a specific user
 */
export function getRewardProof(
  tree: MerkleTree,
  entry: UserRewardEntry
): string[] {
  const leaf = generateRewardLeaf(entry);
  return tree.getHexProof(leaf);
}

/**
 * Verifies a reward claim proof
 */
export function verifyRewardProof(
  tree: MerkleTree,
  entry: UserRewardEntry
): boolean {
  const leaf = generateRewardLeaf(entry);
  const proof = tree.getHexProof(leaf);
  const root = tree.getHexRoot();
  return tree.verify(proof, leaf, root);
}

/**
 * Gets the Merkle root as a hex string
 */
export function getRewardsRoot(tree: MerkleTree): string {
  return tree.getHexRoot();
}
