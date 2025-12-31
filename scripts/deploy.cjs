const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);

  // 1. Deploy Time26
  const Time26 = await hre.ethers.getContractFactory('Time26');
  const time26 = await Time26.deploy(deployer.address);
  await time26.deployed();
  console.log('Time26 deployed to:', time26.address);

  // 2. Deploy ProofOfExistence
  const ProofOfExistence =
    await hre.ethers.getContractFactory('ProofOfExistence');
  // Assuming treasury is the deployer for now
  const proof = await ProofOfExistence.deploy(
    time26.address,
    deployer.address, // Treasury
    deployer.address // Owner
  );
  await proof.deployed();
  console.log('ProofOfExistence deployed to:', proof.address);

  // 3. Setup Pricing (Default Dev Pricing)
  // Low costs for testing
  await proof.setPricing(
    hre.ethers.utils.parseEther('0.01'), // Base Native
    hre.ethers.utils.parseEther('0.001'), // Rate Native
    hre.ethers.utils.parseEther('10'), // Base Time26
    hre.ethers.utils.parseEther('1'), // Rate Time26
    45 // Allowance
  );
  console.log('Pricing configured.');

  // 4. Mint some Time26 to the deployer (already done in constructor)
  // But let's approve it for testing consumption
  // Note: This approves for the DEPLOYER/SERVER. The USER in the browser is different.
  // The user will need to mint/get tokens in the frontend if they want to pay with Time26.
  // For Native payment (mintEternalNative), they just need ETH.
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
