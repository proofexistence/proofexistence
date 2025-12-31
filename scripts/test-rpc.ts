import { config } from 'dotenv';
config({ path: '.env.local' });

import { ethers } from 'ethers';

async function testRpc() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  console.log('RPC URL:', rpcUrl);

  if (!rpcUrl) {
    console.error('❌ NEXT_PUBLIC_RPC_URL not set');
    process.exit(1);
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    console.log('✅ Network:', network.name, '(chainId:', network.chainId, ')');

    const blockNumber = await provider.getBlockNumber();
    console.log('✅ Block number:', blockNumber);
  } catch (error) {
    console.error('❌ RPC Error:', error);
  }

  process.exit(0);
}

testRpc();
