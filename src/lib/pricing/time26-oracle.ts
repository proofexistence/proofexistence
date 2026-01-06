import { ethers } from 'ethers';

/**
 * TIME26 Pricing Oracle
 *
 * Handles price conversion between POL and TIME26 for gasless minting eligibility.
 * - TIME26 price: Static (controlled by us via env var)
 * - POL price: Real-time from CoinGecko with caching
 */

// Default/fallback prices
const DEFAULT_TIME26_PRICE_USD = 0.05; // $0.05 per TIME26
const DEFAULT_POL_PRICE_USD = 0.45; // $0.45 per POL (fallback)

// Cache for POL price (5 minutes)
let cachedPolPrice: { price: number; timestamp: number } | null = null;
const POL_PRICE_CACHE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get TIME26 price in USD (static, from env var)
 */
export function getTime26PriceUsd(): number {
  const envPrice = process.env.TIME26_PRICE_USD;
  if (envPrice) {
    const parsed = parseFloat(envPrice);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_TIME26_PRICE_USD;
}

/**
 * Get POL price in USD (real-time with cache)
 */
export function getPolPriceUsd(): number {
  // Check cache first
  if (
    cachedPolPrice &&
    Date.now() - cachedPolPrice.timestamp < POL_PRICE_CACHE_MS
  ) {
    return cachedPolPrice.price;
  }

  // Return fallback for sync calls - async fetch will update cache
  const envPrice = process.env.POL_PRICE_USD;
  if (envPrice) {
    const parsed = parseFloat(envPrice);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_POL_PRICE_USD;
}

/**
 * Fetch real-time POL price from CoinGecko
 * Call this before eligibility check for accurate pricing
 */
export async function fetchPolPrice(): Promise<number> {
  // Return cached if fresh
  if (
    cachedPolPrice &&
    Date.now() - cachedPolPrice.timestamp < POL_PRICE_CACHE_MS
  ) {
    return cachedPolPrice.price;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd',
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const price = data?.['matic-network']?.usd;
      if (typeof price === 'number' && price > 0) {
        cachedPolPrice = { price, timestamp: Date.now() };
        return price;
      }
    }
  } catch (err) {
    console.warn('[Pricing] Failed to fetch POL price from CoinGecko:', err);
  }

  // Fallback to env var or default
  return getPolPriceUsd();
}

/**
 * Get both prices (fetches POL price if needed)
 */
export async function getPrices(): Promise<{ time26: number; pol: number }> {
  const pol = await fetchPolPrice();
  const time26 = getTime26PriceUsd();
  return { time26, pol };
}

/**
 * Convert POL amount (in wei) to TIME26 equivalent (in wei)
 *
 * Formula: TIME26 = POL * (POL_PRICE / TIME26_PRICE)
 *
 * Example: 0.01 POL at $0.45/POL and $0.05/TIME26
 *          = 0.01 * (0.45 / 0.05) = 0.09 TIME26
 */
export function convertPolToTime26(polWei: bigint): bigint {
  const polPriceUsd = getPolPriceUsd();
  const time26PriceUsd = getTime26PriceUsd();

  // Conversion ratio (scaled by 1e18 for precision)
  const ratioScaled = BigInt(Math.floor((polPriceUsd / time26PriceUsd) * 1e18));

  // TIME26 (wei) = POL (wei) * ratio / 1e18
  return (polWei * ratioScaled) / BigInt(1e18);
}

/**
 * Convert TIME26 amount (in wei) to USD value
 */
export function time26ToUsd(time26Wei: bigint): number {
  const time26PriceUsd = getTime26PriceUsd();
  const time26Float = parseFloat(ethers.formatEther(time26Wei));
  return time26Float * time26PriceUsd;
}

/**
 * Convert POL amount (in wei) to USD value
 */
export function polToUsd(polWei: bigint): number {
  const polPriceUsd = getPolPriceUsd();
  const polFloat = parseFloat(ethers.formatEther(polWei));
  return polFloat * polPriceUsd;
}

export interface GaslessEligibilityResult {
  eligible: boolean;
  unclaimedBalance: bigint;
  mintCostTime26: bigint;
  gasCostTime26: bigint;
  totalCostTime26: bigint;
  shortfall?: bigint;
  reason?: 'insufficient_balance' | 'value_too_low';
  // For display
  mintCostFormatted: string;
  gasCostFormatted: string;
  totalCostFormatted: string;
  unclaimedFormatted: string;
}

/**
 * Check if user is eligible for gasless minting
 *
 * Eligibility requires:
 * 1. Unclaimed balance >= total cost (mint + gas in TIME26)
 * 2. Total TIME26 value > gas cost (dynamic check to prevent loss)
 */
export function checkGaslessEligibility(
  unclaimedBalance: bigint,
  mintCostTime26: bigint,
  estimatedGasWei: bigint
): GaslessEligibilityResult {
  // Convert gas cost from POL to TIME26
  const gasCostTime26 = convertPolToTime26(estimatedGasWei);

  // Total cost user must pay
  const totalCostTime26 = mintCostTime26 + gasCostTime26;

  // Check if user has enough balance
  const hasEnoughBalance = unclaimedBalance >= totalCostTime26;

  // Dynamic check: TIME26 value must exceed gas cost
  // This ensures we don't lose money sponsoring cheap mints
  const time26ValueUsd = time26ToUsd(totalCostTime26);
  const gasCostUsd = polToUsd(estimatedGasWei);
  const valueExceedsGas = time26ValueUsd > gasCostUsd;

  const eligible = hasEnoughBalance && valueExceedsGas;

  // Determine reason for ineligibility
  let reason: 'insufficient_balance' | 'value_too_low' | undefined;
  if (!eligible) {
    if (!hasEnoughBalance) {
      reason = 'insufficient_balance';
    } else if (!valueExceedsGas) {
      reason = 'value_too_low';
    }
  }

  return {
    eligible,
    unclaimedBalance,
    mintCostTime26,
    gasCostTime26,
    totalCostTime26,
    shortfall: hasEnoughBalance
      ? undefined
      : totalCostTime26 - unclaimedBalance,
    reason,
    // Formatted values for display
    mintCostFormatted: formatTime26(mintCostTime26),
    gasCostFormatted: formatTime26(gasCostTime26),
    totalCostFormatted: formatTime26(totalCostTime26),
    unclaimedFormatted: formatTime26(unclaimedBalance),
  };
}

/**
 * Format TIME26 wei to human readable string
 */
export function formatTime26(wei: bigint): string {
  const formatted = ethers.formatEther(wei);
  const num = parseFloat(formatted);
  if (num === 0) return '0';
  if (num < 0.01) return '< 0.01';
  return num.toFixed(2);
}

/**
 * Get current pricing config for debugging/admin
 */
export function getPricingConfig() {
  return {
    time26PriceUsd: getTime26PriceUsd(),
    polPriceUsd: getPolPriceUsd(),
    conversionRatio: getPolPriceUsd() / getTime26PriceUsd(),
  };
}
