/**
 * Arweave Gateway URL utilities
 * Can be used on both client and server side
 */

// Check for testnet flag
// NEXT_PUBLIC_ env vars are available on both client and server
export const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';

// Gateway URLs
// - Primary: ar-io.net for instant access with Turbo (ArDrive uploads)
// - Fallback: devnet.irys.xyz for legacy Irys devnet uploads (testnet only)
export const ARWEAVE_GATEWAY = 'https://ar-io.net';
export const IRYS_DEVNET_GATEWAY = 'https://devnet.irys.xyz';

/**
 * Get the full URL for an Arweave transaction ID
 * Uses the primary gateway (ar-io.net)
 */
export function getArweaveUrl(txId: string): string {
  return `${ARWEAVE_GATEWAY}/${txId}`;
}

/**
 * Get fallback URLs for a transaction ID
 * Returns array of gateway URLs to try in order
 */
export function getArweaveUrls(txId: string): string[] {
  const urls = [`${ARWEAVE_GATEWAY}/${txId}`];
  // Add Irys devnet fallback for testnet (legacy uploads)
  if (isTestnet) {
    urls.push(`${IRYS_DEVNET_GATEWAY}/${txId}`);
  }
  return urls;
}

/**
 * Normalize an Arweave URL to use the correct gateway
 * Converts ar://, gateway.irys.xyz, or arweave.net URLs to the appropriate gateway
 */
export function normalizeArweaveUrl(url: string): string {
  return url
    .replace('ar://', `${ARWEAVE_GATEWAY}/`)
    .replace('https://gateway.irys.xyz/', `${ARWEAVE_GATEWAY}/`)
    .replace('https://devnet.irys.xyz/', `${ARWEAVE_GATEWAY}/`)
    .replace('https://arweave.net/', `${ARWEAVE_GATEWAY}/`);
}

/**
 * Fetch with timeout helper
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch metadata from Arweave gateway with timeout and fallback
 * Tries primary gateway first, then falls back to Irys devnet on testnet
 * Returns null if all gateways fail (caller should handle fallback to previewUrl)
 */
export async function fetchArweaveMetadata(
  txId: string,
  timeoutMs: number = 3000
): Promise<{ image?: string; name?: string; description?: string } | null> {
  const urls = getArweaveUrls(txId);

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, timeoutMs);
      if (!res.ok) continue;

      const metadata = await res.json();
      if (metadata.image) {
        metadata.image = normalizeArweaveUrl(metadata.image);
      }
      return metadata;
    } catch {
      // Try next gateway
      continue;
    }
  }

  // All gateways failed
  return null;
}
