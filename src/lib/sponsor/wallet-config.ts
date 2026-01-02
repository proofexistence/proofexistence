export type ChainId = 'polygon' | 'bitcoin' | 'solana';

export interface Token {
  symbol: string;
  name: string;
  contractAddress?: string;
}

export interface ChainConfig {
  id: ChainId;
  name: string;
  color: string;
  address: string;
  explorerUrl: string;
  tokens: Token[];
}

export const SPONSOR_WALLETS: ChainConfig[] = [
  {
    id: 'polygon',
    name: 'Polygon',
    color: 'from-purple-400 to-violet-500',
    address: '0x75C30aAFdb52d95BADCEe42789A814fAf1fd9b81',
    explorerUrl: 'https://polygonscan.com/address/',
    tokens: [
      { symbol: 'POL', name: 'Polygon' },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        contractAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      },
      {
        symbol: 'USDT',
        name: 'Tether',
        contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      },
    ],
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    color: 'from-orange-400 to-amber-500',
    address: 'bc1qsu4jdm0mfpt3wr64jzzyzurlk3htlpzpegtj6m',
    explorerUrl: 'https://mempool.space/address/',
    tokens: [{ symbol: 'BTC', name: 'Bitcoin' }],
  },
  {
    id: 'solana',
    name: 'Solana',
    color: 'from-purple-400 to-fuchsia-500',
    address: '22mGKwt9ygQqLiGg2zyzcb6uHEdUdEyerfNSvxYtt6xV',
    explorerUrl: 'https://solscan.io/account/',
    tokens: [
      { symbol: 'SOL', name: 'Solana' },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      },
      {
        symbol: 'USDT',
        name: 'Tether',
        contractAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      },
    ],
  },
];

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getExplorerLink(chain: ChainConfig): string {
  return `${chain.explorerUrl}${chain.address}`;
}
