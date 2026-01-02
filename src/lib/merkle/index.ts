import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import { ethers } from 'ethers';

export interface BatchSession {
  sessionId: string;
  userId: string;
  timestamp: number;
  data: string; // JSON string of trail data or metadata
}

/**
 * Generates a leaf node for the Merkle Tree
 * Leaf Structure: keccak256(sessionId + userId + timestamp + dataHash)
 */
export function generateLeaf(session: BatchSession): Buffer {
  const dataHash = ethers.id(session.data);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const leafContent = abiCoder.encode(
    ['string', 'string', 'uint256', 'bytes32'],
    [session.sessionId, session.userId, session.timestamp, dataHash]
  );
  return keccak256(leafContent);
}

/**
 * Generates the full Merkle Tree from a list of sessions
 */
export function generateMerkleTree(sessions: BatchSession[]): MerkleTree {
  const leaves = sessions.map((s) => generateLeaf(s));
  // Sort pairs to ensure determinism
  return new MerkleTree(leaves, keccak256, { sortPairs: true });
}

/**
 * Verifies if a session is part of the Merkle Tree
 */
export function verifyProof(
  tree: MerkleTree,
  session: BatchSession,
  root: string
): boolean {
  const leaf = generateLeaf(session);
  const proof = tree.getHexProof(leaf);
  return tree.verify(proof, leaf, root);
}
