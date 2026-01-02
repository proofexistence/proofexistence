/**
 * Set contract pricing for POE
 * Run: npx tsx scripts/set-pricing.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { ethers } from 'ethers';

const POE_ADDRESS = '0x0c109bEc02C2b548980fE357BF32D938A0bfc5bf';

const POE_ABI = [
  'function setPricing(uint256 _baseNative, uint256 _rateNative, uint256 _baseTime26, uint256 _rateTime26, uint256 _allowance) external',
  'function baseFeeNative() view returns (uint256)',
  'function pricePerSecondNative() view returns (uint256)',
  'function baseFeeTime26() view returns (uint256)',
  'function pricePerSecondTime26() view returns (uint256)',
  'function freeAllowance() view returns (uint256)',
  'function calculateCostNative(uint256 duration) view returns (uint256)',
  'function calculateCostTime26(uint256 duration) view returns (uint256)',
  'function owner() view returns (address)',
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const poe = new ethers.Contract(POE_ADDRESS, POE_ABI, wallet);

  console.log('📊 Current Pricing Configuration\n');
  console.log('━'.repeat(50));

  // Check current pricing
  const [baseNative, rateNative, baseTime26, rateTime26, freeAllowance, owner] =
    await Promise.all([
      poe.baseFeeNative(),
      poe.pricePerSecondNative(),
      poe.baseFeeTime26(),
      poe.pricePerSecondTime26(),
      poe.freeAllowance(),
      poe.owner(),
    ]);

  console.log('Contract Owner:', owner);
  console.log('Your Wallet:', wallet.address);
  console.log('');
  console.log('POL (Native) Pricing:');
  console.log(`  Base Fee: ${ethers.formatEther(baseNative)} POL`);
  console.log(`  Per Second: ${ethers.formatEther(rateNative)} POL`);
  console.log('');
  console.log('TIME26 Pricing:');
  console.log(`  Base Fee: ${ethers.formatUnits(baseTime26, 18)} TIME26`);
  console.log(`  Per Second: ${ethers.formatUnits(rateTime26, 18)} TIME26`);
  console.log('');
  console.log(`Free Allowance: ${freeAllowance.toString()} seconds`);

  // Calculate example costs
  console.log('\n📝 Example Costs (Current):');
  for (const duration of [30, 60, 120, 300]) {
    const costNative = await poe.calculateCostNative(duration);
    const costTime26 = await poe.calculateCostTime26(duration);
    console.log(
      `  ${duration}s: ${ethers.formatEther(costNative)} POL / ${ethers.formatUnits(costTime26, 18)} TIME26`
    );
  }

  // ========== NEW PRICING ==========
  console.log('\n━'.repeat(50));
  console.log('🆕 Setting New Pricing\n');

  // New pricing structure (accessible and fair)
  // Assuming POL ≈ $0.40, TIME26 ≈ $0.01
  const newPricing = {
    // POL pricing: ~$0.04 base + ~$0.004/second
    baseNative: ethers.parseEther('0.1'), // 0.1 POL base
    rateNative: ethers.parseEther('0.005'), // 0.005 POL per second

    // TIME26 pricing: ~$0.10 base + ~$0.01/second (with 20% discount)
    baseTime26: ethers.parseUnits('10', 18), // 10 TIME26 base
    rateTime26: ethers.parseUnits('1', 18), // 1 TIME26 per second

    freeAllowance: 45, // 45 seconds free
  };

  console.log('New POL (Native) Pricing:');
  console.log(`  Base Fee: ${ethers.formatEther(newPricing.baseNative)} POL`);
  console.log(`  Per Second: ${ethers.formatEther(newPricing.rateNative)} POL`);
  console.log('');
  console.log('New TIME26 Pricing:');
  console.log(
    `  Base Fee: ${ethers.formatUnits(newPricing.baseTime26, 18)} TIME26`
  );
  console.log(
    `  Per Second: ${ethers.formatUnits(newPricing.rateTime26, 18)} TIME26`
  );
  console.log('');
  console.log(`Free Allowance: ${newPricing.freeAllowance} seconds`);

  // Calculate new example costs
  console.log('\n📝 Example Costs (New):');
  for (const duration of [30, 60, 120, 300]) {
    const extraTime = Math.max(0, duration - newPricing.freeAllowance);
    const costNative =
      parseFloat(ethers.formatEther(newPricing.baseNative)) +
      extraTime * parseFloat(ethers.formatEther(newPricing.rateNative));
    const costTime26 =
      parseFloat(ethers.formatUnits(newPricing.baseTime26, 18)) +
      extraTime * parseFloat(ethers.formatUnits(newPricing.rateTime26, 18));
    console.log(
      `  ${duration}s: ${costNative.toFixed(3)} POL / ${costTime26} TIME26`
    );
  }

  // Confirm and set
  console.log('\n⚠️  Setting new pricing...');

  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.log('❌ You are not the contract owner. Cannot set pricing.');
    return;
  }

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? BigInt(0);
  const tx = await poe.setPricing(
    newPricing.baseNative,
    newPricing.rateNative,
    newPricing.baseTime26,
    newPricing.rateTime26,
    newPricing.freeAllowance,
    {
      gasPrice: (gasPrice * BigInt(150)) / BigInt(100),
    }
  );

  console.log(`TX: ${tx.hash}`);
  await tx.wait();
  console.log('✅ Pricing updated successfully!');

  // Verify
  console.log('\n📊 Verified New Pricing:');
  const [newBaseNative, newRateNative, newBaseTime26v, newRateTime26v] =
    await Promise.all([
      poe.baseFeeNative(),
      poe.pricePerSecondNative(),
      poe.baseFeeTime26(),
      poe.pricePerSecondTime26(),
    ]);
  console.log(
    `  POL: ${ethers.formatEther(newBaseNative)} base + ${ethers.formatEther(newRateNative)}/s`
  );
  console.log(
    `  TIME26: ${ethers.formatUnits(newBaseTime26v, 18)} base + ${ethers.formatUnits(newRateTime26v, 18)}/s`
  );
}

main().catch(console.error);
