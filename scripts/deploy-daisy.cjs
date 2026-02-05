// scripts/deploy-daisy.cjs
// Deploy DaisyChronicles contracts to Polygon Amoy testnet
//
// Usage: npx hardhat run scripts/deploy-daisy.cjs --network amoy

const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log(
    'Deploying DaisyChronicles contracts with account:',
    deployer.address
  );
  console.log(
    'Account balance:',
    (await hre.ethers.provider.getBalance(deployer.address)).toString()
  );

  // Use deployer as operator, treasury, royaltyReceiver, and owner for testnet
  // In production, these should be different addresses
  const operator = deployer.address;
  const treasury = deployer.address;
  const royaltyReceiver = deployer.address;
  const royaltyBps = 500; // 5% royalty
  const owner = deployer.address;

  console.log('\nConfiguration:');
  console.log('  Operator:', operator);
  console.log('  Treasury:', treasury);
  console.log('  Royalty Receiver:', royaltyReceiver);
  console.log('  Royalty BPS:', royaltyBps, '(5%)');
  console.log('  Owner:', owner);

  // Deploy Genesis (ERC-721)
  console.log('\n[1/2] Deploying DaisyChroniclesGenesis...');
  const Genesis = await hre.ethers.getContractFactory('DaisyChroniclesGenesis');
  const genesis = await Genesis.deploy(
    operator,
    treasury,
    royaltyReceiver,
    royaltyBps,
    owner
  );
  await genesis.waitForDeployment();
  const genesisAddress = await genesis.getAddress();
  console.log('DaisyChroniclesGenesis deployed to:', genesisAddress);

  // Deploy Standard (ERC-1155)
  console.log('\n[2/2] Deploying DaisyChroniclesStandard...');
  const Standard = await hre.ethers.getContractFactory(
    'DaisyChroniclesStandard'
  );
  const standard = await Standard.deploy(
    operator,
    treasury,
    royaltyReceiver,
    royaltyBps,
    owner
  );
  await standard.waitForDeployment();
  const standardAddress = await standard.getAddress();
  console.log('DaisyChroniclesStandard deployed to:', standardAddress);

  // Summary
  console.log('\n========================================');
  console.log('Deployment Complete!');
  console.log('========================================');
  console.log('\nUpdate src/lib/contracts.ts with these addresses:');
  console.log(`
// DaisyChronicles Genesis (ERC-721, 1/1 Auctions)
export const DAISY_GENESIS_ADDRESS = isTestnet
  ? '${genesisAddress}' // Amoy testnet
  : '0x0000000000000000000000000000000000000000'; // TODO: Deploy to mainnet

// DaisyChronicles Standard (ERC-1155, Unlimited Editions)
export const DAISY_STANDARD_ADDRESS = isTestnet
  ? '${standardAddress}' // Amoy testnet
  : '0x0000000000000000000000000000000000000000'; // TODO: Deploy to mainnet
`);

  // Verify contracts (optional, may fail if not configured)
  if (process.env.POLYGONSCAN_API_KEY) {
    console.log('\nVerifying contracts on Polygonscan...');
    try {
      await hre.run('verify:verify', {
        address: genesisAddress,
        constructorArguments: [
          operator,
          treasury,
          royaltyReceiver,
          royaltyBps,
          owner,
        ],
      });
      console.log('Genesis verified!');
    } catch (e) {
      console.log('Genesis verification failed:', e.message);
    }

    try {
      await hre.run('verify:verify', {
        address: standardAddress,
        constructorArguments: [
          operator,
          treasury,
          royaltyReceiver,
          royaltyBps,
          owner,
        ],
      });
      console.log('Standard verified!');
    } catch (e) {
      console.log('Standard verification failed:', e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
