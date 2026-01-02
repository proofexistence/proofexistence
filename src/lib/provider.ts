/**
 * Custom ethers.js provider that uses native fetch
 * This fixes compatibility issues with Next.js 16 Turbopack
 */
import { ethers } from 'ethers';
import { isTestnet, CHAIN_ID, RPC_URL } from './contracts';

// Native fetch-based JSON-RPC call
async function fetchJsonRpc(
  url: string,
  method: string,
  params: unknown[] = []
): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'RPC error');
  }

  return data.result;
}

/**
 * Custom provider that wraps native fetch for JSON-RPC calls
 * Use this in Next.js API routes where ethers.js's built-in fetch doesn't work
 */
export class NativeFetchProvider extends ethers.JsonRpcProvider {
  private rpcUrl: string;

  constructor(url: string, network?: ethers.Networkish) {
    super(url, network);
    this.rpcUrl = url;
  }

  // Override send for all JSON-RPC calls
  async send(method: string, params: unknown[]): Promise<unknown> {
    return fetchJsonRpc(this.rpcUrl, method, params);
  }

  // Override _send which is used in some cases
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async _send(payload: any | any[]): Promise<any[]> {
    if (Array.isArray(payload)) {
      // Batch request
      const results = await Promise.all(
        payload.map((p) => fetchJsonRpc(this.rpcUrl, p.method, p.params))
      );
      return results.map((result, i) => ({
        id: payload[i].id,
        jsonrpc: '2.0',
        result,
      }));
    } else {
      const result = await fetchJsonRpc(
        this.rpcUrl,
        payload.method,
        payload.params
      );
      return [{ id: payload.id, jsonrpc: '2.0', result }];
    }
  }
}

/**
 * Create a provider for the configured network (mainnet or testnet)
 */
export function createProvider(): NativeFetchProvider {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || RPC_URL;

  return new NativeFetchProvider(rpcUrl, {
    chainId: CHAIN_ID,
    name: isTestnet ? 'polygon-amoy' : 'matic',
  });
}

/**
 * @deprecated Use createProvider() instead
 */
export function createAmoyProvider(): NativeFetchProvider {
  return createProvider();
}

/**
 * Create a wallet connected to the configured network
 */
export function createWallet(): ethers.Wallet {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is not set');
  }

  const provider = createProvider();
  return new ethers.Wallet(privateKey, provider);
}

/**
 * @deprecated Use createWallet() instead
 */
export function createAmoyWallet(): ethers.Wallet {
  return createWallet();
}

/**
 * Create a provider for Polygon mainnet
 * Alias for createProvider() when explicitly targeting mainnet
 */
export function createPolygonProvider(): NativeFetchProvider {
  return createProvider();
}

/**
 * Wait for a transaction to be confirmed using native fetch polling
 * This replaces tx.wait() which has issues in Next.js
 */
export async function waitForTransaction(
  provider: NativeFetchProvider,
  txHash: string,
  confirmations = 1,
  timeout = 60000
): Promise<ethers.TransactionReceipt> {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < timeout) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) {
        const currentConfirmations = await receipt.confirmations();
        if (currentConfirmations >= confirmations) {
          return receipt;
        }
      }
    } catch {
      // Ignore errors during polling
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Transaction ${txHash} not confirmed within ${timeout}ms`);
}
