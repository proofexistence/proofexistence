/**
 * Check ProofRecorder contract on current network
 */

const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

const PROOF_RECORDER_ABI = [
  'function rewardsMerkleRoot() view returns (bytes32)',
  'function operator() view returns (address)',
  'function treasury() view returns (address)',
  'function time26() view returns (address)',
  'function setRewardsMerkleRoot(bytes32 newRoot)',
];

async function check() {
  const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';
  const contractAddress = isTestnet
    ? '0xA0b6b101Cde5FeF3458C820928d1202A281001cd' // v4 with rewards
    : '0x72Ac729a8f6efb68A5d6765EC375aC4578a3c756';

  // Use network-appropriate RPC
  const rpcUrl = isTestnet
    ? process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology'
    : 'https://polygon-rpc.com';

  console.log('Network:', isTestnet ? 'Amoy Testnet' : 'Polygon Mainnet');
  console.log('RPC:', rpcUrl);
  console.log('Contract:', contractAddress);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(
    contractAddress,
    PROOF_RECORDER_ABI,
    provider
  );

  try {
    // Check if contract exists
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      console.log('\n❌ Contract not deployed at this address!');
      return;
    }
    console.log('\n✓ Contract exists');

    // Check contract state
    const merkleRoot = await contract.rewardsMerkleRoot();
    console.log('Current Merkle Root:', merkleRoot);

    const operator = await contract.operator();
    console.log('Operator:', operator);

    const treasury = await contract.treasury();
    console.log('Treasury:', treasury);

    // Check if our wallet is the operator
    const privateKey =
      process.env.OPERATOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey);
    console.log('\nOur wallet:', wallet.address);
    console.log(
      'Is operator?',
      wallet.address.toLowerCase() === operator.toLowerCase()
    );
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
