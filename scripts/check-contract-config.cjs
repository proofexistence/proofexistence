const hre = require('hardhat');

async function main() {
  const poeAddress = '0x9A676e781A523b5d0C0e43731313A708CB607508';
  const frontendTime26Address = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

  const ProofOfExistence =
    await hre.ethers.getContractFactory('ProofOfExistence');
  const poe = await ProofOfExistence.attach(poeAddress);

  // Variable is named 'time26Token' in the contract
  const onChainTime26Address = await poe.time26Token();

  console.log('---------------------------------------------------');
  console.log('PoE Contract Address:      ', poeAddress);
  console.log('PoE.time26Token() Address: ', onChainTime26Address);
  console.log('Frontend Time26 Address:   ', frontendTime26Address);
  console.log('---------------------------------------------------');

  if (
    onChainTime26Address.toLowerCase() !== frontendTime26Address.toLowerCase()
  ) {
    console.log('⚠️ MISMATCH DETECTED! ⚠️');
    console.log('The frontend is approving the WRONG Time26 contract.');
    console.log('Update src/lib/contracts.ts to use:', onChainTime26Address);
  } else {
    console.log('✅ Configuration matches.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
