/**
 * Test Time26 payment flow for Instant Proof minting
 * Run: npx tsx scripts/test-time26-payment.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { ethers } from 'ethers';

// Contract addresses (Amoy testnet)
const POE_ADDRESS = '0x0c109bEc02C2b548980fE357BF32D938A0bfc5bf';
const TIME26_ADDRESS = '0x04dAa891066d5cAf98Df93c2C2Ae2F9b6B62e591';

const POE_ABI = [
  'function mintEternalTime26(uint256 duration, string memory metadataURI, string memory displayName, string memory message) external',
  'function calculateCostTime26(uint256 duration) public view returns (uint256)',
  'function time26Token() public view returns (address)',
  'function treasury() public view returns (address)',
  'function baseFeeTime26() public view returns (uint256)',
  'function pricePerSecondTime26() public view returns (uint256)',
  'function freeAllowance() public view returns (uint256)',
  'event ExistenceMinted(uint256 indexed id, address indexed owner, uint256 duration, string metadataURI, string displayName, string message)',
];

const TIME26_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'function symbol() public view returns (string)',
  'function totalSupply() public view returns (uint256)',
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

  console.log('🚀 Testing Time26 Payment Flow\n');
  console.log('━'.repeat(50));

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`📍 Wallet: ${wallet.address}`);
  console.log(`📍 POE Contract: ${POE_ADDRESS}`);
  console.log(`📍 TIME26 Contract: ${TIME26_ADDRESS}`);
  console.log('━'.repeat(50));

  // Connect to contracts
  const poe = new ethers.Contract(POE_ADDRESS, POE_ABI, wallet);
  const time26 = new ethers.Contract(TIME26_ADDRESS, TIME26_ABI, wallet);

  // Step 1: Check Time26 balance
  console.log('\n📊 Step 1: Checking Time26 balance...');
  const balance = await time26.balanceOf(wallet.address);
  const decimals = await time26.decimals();
  const symbol = await time26.symbol();
  console.log(
    `   Balance: ${ethers.utils.formatUnits(balance, decimals)} ${symbol}`
  );

  if (balance.isZero()) {
    console.log('\n❌ No TIME26 balance. Need tokens to test payment.');
    console.log(
      '   You need to transfer some TIME26 tokens to your wallet first.'
    );
    process.exit(1);
  }

  // Step 2: Check POE contract configuration
  console.log('\n📊 Step 2: Checking POE contract configuration...');
  const linkedTime26 = await poe.time26Token();
  const treasury = await poe.treasury();
  const baseFee = await poe.baseFeeTime26();
  const pricePerSecond = await poe.pricePerSecondTime26();
  const freeAllowance = await poe.freeAllowance();

  console.log(`   Linked TIME26: ${linkedTime26}`);
  console.log(`   Treasury: ${treasury}`);
  console.log(
    `   Base Fee: ${ethers.utils.formatUnits(baseFee, decimals)} TIME26`
  );
  console.log(
    `   Price/Second: ${ethers.utils.formatUnits(pricePerSecond, decimals)} TIME26`
  );
  console.log(`   Free Allowance: ${freeAllowance.toString()} seconds`);

  // Verify TIME26 address matches
  if (linkedTime26.toLowerCase() !== TIME26_ADDRESS.toLowerCase()) {
    console.log('\n⚠️  Warning: POE contract TIME26 address mismatch!');
    console.log(`   Expected: ${TIME26_ADDRESS}`);
    console.log(`   Actual: ${linkedTime26}`);
  }

  // Step 3: Calculate cost for a test mint
  const testDuration = 60; // 60 seconds
  console.log(`\n📊 Step 3: Calculating cost for ${testDuration}s duration...`);
  const cost = await poe.calculateCostTime26(testDuration);
  console.log(`   Cost: ${ethers.utils.formatUnits(cost, decimals)} TIME26`);

  if (cost.gt(balance)) {
    console.log('\n❌ Insufficient TIME26 balance for test mint.');
    console.log(`   Need: ${ethers.utils.formatUnits(cost, decimals)} TIME26`);
    console.log(
      `   Have: ${ethers.utils.formatUnits(balance, decimals)} TIME26`
    );
    process.exit(1);
  }

  // Step 4: Check and set approval
  console.log('\n📊 Step 4: Checking TIME26 approval...');
  const currentAllowance = await time26.allowance(wallet.address, POE_ADDRESS);
  console.log(
    `   Current allowance: ${ethers.utils.formatUnits(currentAllowance, decimals)} TIME26`
  );

  if (currentAllowance.lt(cost)) {
    console.log('   Approving TIME26 spend...');
    const gasPrice = await provider.getGasPrice();
    const adjustedGasPrice = gasPrice.mul(150).div(100);
    const approveTx = await time26.approve(
      POE_ADDRESS,
      ethers.constants.MaxUint256,
      {
        gasPrice: adjustedGasPrice,
      }
    );
    console.log(`   TX: ${approveTx.hash}`);
    await approveTx.wait();
    console.log('   ✅ Approval confirmed');
  } else {
    console.log('   ✅ Already approved');
  }

  // Step 5: Execute mintEternalTime26
  console.log('\n📊 Step 5: Minting Eternal Proof with TIME26...');
  const testMetadata = `https://arweave.net/test-${Date.now()}`;
  const testDisplayName = 'Test User';
  const testMessage = 'Testing TIME26 payment flow';

  console.log(`   Duration: ${testDuration}s`);
  console.log(`   Metadata: ${testMetadata}`);
  console.log(`   Display Name: ${testDisplayName}`);
  console.log(`   Message: ${testMessage}`);

  try {
    const gasPrice = await provider.getGasPrice();
    const adjustedGasPrice = gasPrice.mul(150).div(100);
    const mintTx = await poe.mintEternalTime26(
      testDuration,
      testMetadata,
      testDisplayName,
      testMessage,
      {
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
    const newBalance = await time26.balanceOf(wallet.address);
    const spent = balance.sub(newBalance);
    console.log(
      `\n💰 TIME26 spent: ${ethers.utils.formatUnits(spent, decimals)} TIME26`
    );
    console.log(
      `   New balance: ${ethers.utils.formatUnits(newBalance, decimals)} TIME26`
    );

    console.log('\n━'.repeat(50));
    console.log('✅ TIME26 Payment Test PASSED!');
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
