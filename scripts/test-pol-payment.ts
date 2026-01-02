/**
 * Test POL (native) payment flow for Instant Proof minting
 * Run: npx tsx scripts/test-pol-payment.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { ethers } from 'ethers';

const POE_ADDRESS = '0x0c109bEc02C2b548980fE357BF32D938A0bfc5bf';

const POE_ABI = [
  'function mintEternalNative(uint256 duration, string memory metadataURI, string memory displayName, string memory message) external payable',
  'function calculateCostNative(uint256 duration) public view returns (uint256)',
  'function baseFeeNative() public view returns (uint256)',
  'function pricePerSecondNative() public view returns (uint256)',
  'function freeAllowance() public view returns (uint256)',
  'function treasury() public view returns (address)',
  'event ExistenceMinted(uint256 indexed id, address indexed owner, uint256 duration, string metadataURI, string displayName, string message)',
];

async function main() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    console.error(
      '❌ Missing NEXT_PUBLIC_RPC_URL or PRIVATE_KEY in .env.local'
    );
    process.exit(1);
  }

  console.log('🚀 Testing POL (Native) Payment Flow\n');
  console.log('━'.repeat(50));

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`📍 Wallet: ${wallet.address}`);
  console.log(`📍 POE Contract: ${POE_ADDRESS}`);
  console.log('━'.repeat(50));

  const poe = new ethers.Contract(POE_ADDRESS, POE_ABI, wallet);

  // Check wallet balance
  console.log('\n📊 Step 1: Checking POL balance...');
  const balance = await provider.getBalance(wallet.address);
  console.log(`   Balance: ${ethers.formatEther(balance)} POL`);

  // Check POE contract configuration
  console.log('\n📊 Step 2: Checking POE contract configuration...');
  const treasury = await poe.treasury();
  const baseFee = await poe.baseFeeNative();
  const pricePerSecond = await poe.pricePerSecondNative();
  const freeAllowance = await poe.freeAllowance();

  console.log(`   Treasury: ${treasury}`);
  console.log(`   Base Fee: ${ethers.formatEther(baseFee)} POL`);
  console.log(`   Price/Second: ${ethers.formatEther(pricePerSecond)} POL`);
  console.log(`   Free Allowance: ${freeAllowance.toString()} seconds`);

  // Calculate cost for test mint
  const testDuration = 60;
  console.log(`\n📊 Step 3: Calculating cost for ${testDuration}s duration...`);
  const cost = await poe.calculateCostNative(testDuration);
  console.log(`   Cost: ${ethers.formatEther(cost)} POL`);

  if (cost.gt(balance)) {
    console.log('\n❌ Insufficient POL balance for test mint.');
    console.log(`   Need: ${ethers.formatEther(cost)} POL`);
    console.log(`   Have: ${ethers.formatEther(balance)} POL`);
    process.exit(1);
  }

  // Execute mintEternalNative
  console.log('\n📊 Step 4: Minting Eternal Proof with POL...');
  const testMetadata = `https://arweave.net/pol-test-${Date.now()}`;
  const testDisplayName = 'POL Test User';
  const testMessage = 'Testing POL payment flow';

  console.log(`   Duration: ${testDuration}s`);
  console.log(`   Metadata: ${testMetadata}`);
  console.log(`   Display Name: ${testDisplayName}`);
  console.log(`   Message: ${testMessage}`);
  console.log(`   Value: ${ethers.formatEther(cost)} POL`);

  try {
    const gasPrice = (await provider.getFeeData()).gasPrice ?? BigInt(0);
    const adjustedGasPrice = (gasPrice * BigInt(150)) / BigInt(100);
    const mintTx = await poe.mintEternalNative(
      testDuration,
      testMetadata,
      testDisplayName,
      testMessage,
      {
        value: cost,
        gasLimit: 300000,
        gasPrice: adjustedGasPrice,
      }
    );
    console.log(`   TX: ${mintTx.hash}`);
    console.log('   Waiting for confirmation...');

    const receipt = await mintTx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);

    // Parse ExistenceMinted event
    const mintEvent = receipt.events?.find(
      (e: ethers.Event) => e.event === 'ExistenceMinted'
    );
    if (mintEvent && mintEvent.args) {
      console.log(`\n🎉 Existence Minted!`);
      console.log(`   ID: ${mintEvent.args.id.toString()}`);
      console.log(`   Owner: ${mintEvent.args.owner}`);
      console.log(`   Duration: ${mintEvent.args.duration.toString()}s`);
    }

    // Check new balance
    const newBalance = await provider.getBalance(wallet.address);
    const spent = balance.sub(newBalance);
    console.log(
      `\n💰 POL spent (including gas): ~${ethers.formatEther(spent)} POL`
    );
    console.log(`   New balance: ${ethers.formatEther(newBalance)} POL`);

    console.log('\n━'.repeat(50));
    console.log('✅ POL Payment Test PASSED!');
    console.log('━'.repeat(50));
    console.log(`\n🔗 View on PolygonScan:`);
    console.log(`   https://amoy.polygonscan.com/tx/${mintTx.hash}`);
  } catch (error: unknown) {
    console.error('\n❌ Mint failed:', error);
    if (error instanceof Error && 'reason' in error) {
      console.error('   Reason:', (error as { reason: string }).reason);
    }
    process.exit(1);
  }
}

main().catch(console.error);
