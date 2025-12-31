const hre = require('hardhat');

async function main() {
  const ProofOfExistence =
    await hre.ethers.getContractFactory('ProofOfExistence');
  // Attach to the deployed address - defaulting to the one used in deploy.cjs
  // If you re-deployed, this might need updating, but typically on localhost reset it's the same.
  const proof = await ProofOfExistence.attach(
    '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'
  );

  const nextId = await proof.nextExistenceId();
  console.log(`Total Existences Minted: ${nextId.toString()}`);

  if (nextId > 0) {
    const lastId = nextId.sub(1);
    const data = await proof.existences(lastId);
    console.log('\n--- Latest Mint ---');
    console.log(`ID: ${lastId.toString()}`);
    console.log(`Owner: ${data.owner}`);
    console.log(`Metadata URI: ${data.metadataURI}`);
    console.log(`Duration: ${data.duration.toString()}s`);
  } else {
    console.log('\nNo existences found on this chain yet.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
