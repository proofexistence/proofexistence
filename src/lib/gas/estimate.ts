import { ethers } from 'ethers';
import { createProvider } from '../provider';
import {
  PROOF_RECORDER_ADDRESS,
  PROOF_RECORDER_ABI,
} from '../contracts';

/**
 * Gas estimation utilities for gasless minting
 */

// Default gas limit for mintSponsoredNative (estimated from testing)
const DEFAULT_GAS_LIMIT = BigInt(200000);

// Gas price buffer (20% extra to handle price volatility)
const GAS_PRICE_BUFFER_PERCENT = 20;

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  totalCostWei: bigint;
  totalCostPol: string; // Formatted for display
}

/**
 * Get current gas price from the network with buffer
 */
export async function getCurrentGasPrice(): Promise<bigint> {
  const provider = createProvider();
  const feeData = await provider.getFeeData();

  const baseGasPrice = feeData.gasPrice ?? BigInt(30000000000); // 30 gwei fallback

  // Add buffer to handle price volatility between estimation and execution
  const bufferedPrice =
    (baseGasPrice * BigInt(100 + GAS_PRICE_BUFFER_PERCENT)) / BigInt(100);

  return bufferedPrice;
}

/**
 * Estimate gas for mintSponsoredNative transaction
 *
 * @param duration - Duration in seconds
 * @param metadataURI - Arweave URI (affects gas slightly due to string length)
 * @param displayName - Display name (affects gas slightly)
 * @param message - Message (affects gas slightly)
 * @param recipient - Recipient address
 */
export async function estimateMintGas(
  duration: number,
  metadataURI: string = 'ar://placeholder',
  displayName: string = 'User',
  message: string = '',
  recipient: string = ethers.ZeroAddress
): Promise<GasEstimate> {
  const provider = createProvider();

  // Get operator address for estimation (doesn't need to be the actual signer)
  const operatorAddress =
    process.env.OPERATOR_ADDRESS ||
    (process.env.OPERATOR_PRIVATE_KEY
      ? new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY).address
      : null);

  let gasLimit = DEFAULT_GAS_LIMIT;

  // Try to estimate actual gas if we have an operator address
  if (operatorAddress) {
    try {
      const contract = new ethers.Contract(
        PROOF_RECORDER_ADDRESS,
        PROOF_RECORDER_ABI,
        provider
      );

      // Estimate gas for the actual call
      const estimated = await contract.mintSponsoredNative.estimateGas(
        Math.floor(duration),
        metadataURI,
        displayName,
        message,
        recipient,
        { from: operatorAddress }
      );

      // Add 20% buffer to estimation
      gasLimit =
        (BigInt(estimated.toString()) * BigInt(120)) / BigInt(100);
    } catch (error) {
      // If estimation fails, use default
      console.warn(
        '[GasEstimate] Failed to estimate gas, using default:',
        error
      );
    }
  }

  const gasPrice = await getCurrentGasPrice();
  const totalCostWei = gasLimit * gasPrice;

  return {
    gasLimit,
    gasPrice,
    totalCostWei,
    totalCostPol: ethers.formatEther(totalCostWei),
  };
}

/**
 * Get a quick gas estimate without actual contract estimation
 * Useful for UI display before all parameters are known
 */
export async function getQuickGasEstimate(): Promise<GasEstimate> {
  const gasPrice = await getCurrentGasPrice();
  const gasLimit = DEFAULT_GAS_LIMIT;
  const totalCostWei = gasLimit * gasPrice;

  return {
    gasLimit,
    gasPrice,
    totalCostWei,
    totalCostPol: ethers.formatEther(totalCostWei),
  };
}

/**
 * Format gas estimate for display
 */
export function formatGasEstimate(estimate: GasEstimate): {
  gasLimitDisplay: string;
  gasPriceGwei: string;
  totalCostDisplay: string;
} {
  return {
    gasLimitDisplay: estimate.gasLimit.toString(),
    gasPriceGwei: ethers.formatUnits(estimate.gasPrice, 'gwei'),
    totalCostDisplay: `${parseFloat(estimate.totalCostPol).toFixed(6)} POL`,
  };
}
