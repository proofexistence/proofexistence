'use client';

import { useMemo } from 'react';
import { CHAIN_ID, BLOCK_EXPLORER, isTestnet } from '@/lib/contracts';

export interface NetworkInfo {
  chainId: number;
  name: string;
  shortName: string;
  isTestnet: boolean;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export function useNetworkInfo(): NetworkInfo {
  return useMemo(
    () => ({
      chainId: CHAIN_ID,
      name: isTestnet ? 'Polygon Amoy' : 'Polygon',
      shortName: isTestnet ? 'Amoy' : 'Polygon',
      isTestnet,
      blockExplorerUrl: BLOCK_EXPLORER,
      nativeCurrency: {
        name: 'POL',
        symbol: 'POL',
        decimals: 18,
      },
    }),
    []
  );
}
