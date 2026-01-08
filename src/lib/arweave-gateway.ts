/**
 * Arweave Gateway URL utilities
 * Can be used on both client and server side
 */

// Check for testnet flag
// NEXT_PUBLIC_ env vars are available on both client and server
export const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';

// Gateway URLs
// - Mainnet: arweave.net (data is on real Arweave)
// - Testnet/Devnet: gateway.irys.xyz (data is only on Irys temporary storage)
export const ARWEAVE_GATEWAY = isTestnet
  ? 'https://gateway.irys.xyz'
  : 'https://arweave.net';

/**
 * Get the full URL for an Arweave transaction ID
 * Handles both mainnet (arweave.net) and testnet (gateway.irys.xyz)
 */
export function getArweaveUrl(txId: string): string {
  return `${ARWEAVE_GATEWAY}/${txId}`;
}

/**
 * Normalize an Arweave URL to use the correct gateway
 * Converts ar://, gateway.irys.xyz, or arweave.net URLs to the appropriate gateway
 */
export function normalizeArweaveUrl(url: string): string {
  return url
    .replace('ar://', `${ARWEAVE_GATEWAY}/`)
    .replace(
      isTestnet ? 'https://arweave.net/' : 'https://gateway.irys.xyz/',
      `${ARWEAVE_GATEWAY}/`
    );
}

/**
 * Fetch metadata from Arweave gateway with timeout and fallback
 * Returns null if fetch fails (caller should handle fallback to previewUrl)
 */
export async function fetchArweaveMetadata(
  txId: string,
  timeoutMs: number = 3000
): Promise<{ image?: string; name?: string; description?: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(getArweaveUrl(txId), {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const metadata = await res.json();
    if (metadata.image) {
      metadata.image = normalizeArweaveUrl(metadata.image);
    }
    return metadata;
  } catch {
    // Gateway down or timeout - return null for fallback
    return null;
  }
}
