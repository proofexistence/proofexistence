/**
 * Deploy TIME26 and ProofRecorder v3
 *
 * This script deploys new contracts with reward distribution functionality.
 * TrailNFT remains unchanged - only minter needs to be updated.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-v3.cjs --network polygon
 */

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(balance), "POL");
  console.log("");

  // ============================================================
  // CONFIGURATION - UPDATE THESE VALUES
  // ============================================================

  // Multi-sig Treasury (Owner of all contracts)
  const TREASURY_SAFE = "0xc7b9ED3e985706efeb951462d4281f4Ac8fc99B2";

  // Operator wallet (hot wallet for daily operations)
  const OPERATOR_WALLET = process.env.OPERATOR_ADDRESS || deployer.address;

  // Existing TrailNFT (DO NOT REDEPLOY)
  const TRAIL_NFT = "0x23BA06eeD9007052c9f95f7dC8E92B825399aAa1";

  // Pricing configuration
  const PRICING = {
    baseFeeNative: ethers.utils.parseEther("5"),           // 5 POL base
    pricePerSecondNative: ethers.utils.parseEther("0.05"), // 0.05 POL per second after free allowance
    baseFeeTime26: ethers.utils.parseUnits("400", 18),     // 400 TIME26 (20% discount from 500)
    pricePerSecondTime26: ethers.utils.parseUnits("0.04", 18), // 0.04 TIME26 per second (20% discount)
    freeAllowance: 45                                 // 45 seconds free
  };

  console.log("=".repeat(60));
  console.log("DEPLOYMENT CONFIGURATION");
  console.log("=".repeat(60));
  console.log("Treasury (Owner):", TREASURY_SAFE);
  console.log("Operator:", OPERATOR_WALLET);
  console.log("TrailNFT (existing):", TRAIL_NFT);
  console.log("");

  // ============================================================
  // STEP 1: Deploy TIME26
  // ============================================================
  console.log("Step 1: Deploying TIME26...");

  const Time26 = await ethers.getContractFactory("Time26");
  const time26 = await Time26.deploy(deployer.address); // Deployer receives all tokens initially
  await time26.deployed();

  const time26Address = time26.address;
  console.log("✅ TIME26 deployed to:", time26Address);
  console.log("   Total supply:", ethers.utils.formatEther(await time26.totalSupply()), "TIME26");
  console.log("");

  // ============================================================
  // STEP 2: Deploy ProofRecorder
  // ============================================================
  console.log("Step 2: Deploying ProofRecorder...");

  const ProofRecorder = await ethers.getContractFactory("ProofRecorder");
  const proofRecorder = await ProofRecorder.deploy(
    time26Address,      // TIME26 token address
    TREASURY_SAFE,      // Treasury receives POL payments
    OPERATOR_WALLET,    // Operator for daily operations
    deployer.address    // Deployer as initial owner (will transfer later)
  );
  await proofRecorder.deployed();

  const proofRecorderAddress = proofRecorder.address;
  console.log("✅ ProofRecorder deployed to:", proofRecorderAddress);
  console.log("");

  // ============================================================
  // STEP 3: Configure ProofRecorder
  // ============================================================
  console.log("Step 3: Configuring ProofRecorder...");

  // Set TrailNFT
  console.log("   Setting TrailNFT...");
  let tx = await proofRecorder.setTrailNFT(TRAIL_NFT);
  await tx.wait();
  console.log("   ✅ TrailNFT set");

  // Set pricing
  console.log("   Setting pricing...");
  tx = await proofRecorder.setPricing(
    PRICING.baseFeeNative,
    PRICING.pricePerSecondNative,
    PRICING.baseFeeTime26,
    PRICING.pricePerSecondTime26,
    PRICING.freeAllowance
  );
  await tx.wait();
  console.log("   ✅ Pricing set");
  console.log("      - Base (POL):", ethers.utils.formatEther(PRICING.baseFeeNative), "POL");
  console.log("      - Per second (POL):", ethers.utils.formatEther(PRICING.pricePerSecondNative), "POL");
  console.log("      - Base (TIME26):", ethers.utils.formatUnits(PRICING.baseFeeTime26, 18), "TIME26");
  console.log("      - Per second (TIME26):", ethers.utils.formatUnits(PRICING.pricePerSecondTime26, 18), "TIME26");
  console.log("      - Free allowance:", PRICING.freeAllowance, "seconds");
  console.log("");

  // ============================================================
  // STEP 4: Transfer Ownership to Multi-sig
  // ============================================================
  console.log("Step 4: Transferring ownership to Treasury Safe...");
  tx = await proofRecorder.transferOwnership(TREASURY_SAFE);
  await tx.wait();
  console.log("   ✅ Ownership transferred to:", TREASURY_SAFE);
  console.log("");

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("");
  console.log("New Contract Addresses:");
  console.log("  TIME26:", time26Address);
  console.log("  ProofRecorder:", proofRecorderAddress);
  console.log("");
  console.log("Existing Contract (unchanged):");
  console.log("  TrailNFT:", TRAIL_NFT);
  console.log("");

  console.log("=".repeat(60));
  console.log("MANUAL STEPS REQUIRED");
  console.log("=".repeat(60));
  console.log("");
  console.log("1. Update TrailNFT minter (requires current owner signature):");
  console.log(`   TrailNFT.setMinter("${proofRecorderAddress}")`);
  console.log("");
  console.log("2. Update TrailNFT base URI:");
  console.log(`   TrailNFT.setBaseURI("https://gateway.irys.xyz/")`);
  console.log("");
  console.log("3. Distribute TIME26 tokens from deployer wallet:");
  console.log(`   - 31,536,000 TIME26 → ProofRecorder (${proofRecorderAddress})`);
  console.log(`   - 16,884,000 TIME26 → Treasury Safe (${TREASURY_SAFE})`);
  console.log("");
  console.log("4. Update frontend contract addresses in src/lib/contracts.ts");
  console.log("");
  console.log("5. Transfer ProofRecorder ownership (already set to Treasury)");
  console.log("");

  // ============================================================
  // VERIFICATION COMMANDS
  // ============================================================
  console.log("=".repeat(60));
  console.log("VERIFICATION COMMANDS");
  console.log("=".repeat(60));
  console.log("");
  console.log(`npx hardhat verify --network polygon ${time26Address} "${deployer.address}"`);
  console.log("");
  console.log(`npx hardhat verify --network polygon ${proofRecorderAddress} "${time26Address}" "${TREASURY_SAFE}" "${OPERATOR_WALLET}" "${TREASURY_SAFE}"`);
  console.log("");

  return {
    time26: time26Address,
    proofRecorder: proofRecorderAddress,
    trailNFT: TRAIL_NFT
  };
}

main()
  .then((addresses) => {
    console.log("Deployment successful!");
    console.log(JSON.stringify(addresses, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
