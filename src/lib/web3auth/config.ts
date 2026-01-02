import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from '@web3auth/base';
import type { CustomChainConfig } from '@web3auth/base';

const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';

export const chainConfig: CustomChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: isTestnet ? '0x13882' : '0x89', // Polygon Amoy : Mainnet
  rpcTarget: isTestnet
    ? 'https://polygon-amoy-bor-rpc.publicnode.com'
    : 'https://polygon-bor-rpc.publicnode.com',
  displayName: isTestnet ? 'Polygon Amoy Testnet' : 'Polygon Mainnet',
  blockExplorerUrl: isTestnet
    ? 'https://amoy.polygonscan.com'
    : 'https://polygonscan.com',
  ticker: 'POL',
  tickerName: 'Polygon',
  logo: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
};

export const web3AuthConfig = {
  clientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || '',
  web3AuthNetwork: isTestnet
    ? WEB3AUTH_NETWORK.SAPPHIRE_DEVNET
    : WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
};
