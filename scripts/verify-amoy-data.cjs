const hre = require('hardhat');

async function main() {
  // Amoy Addresses
  const POE_ADDRESS = '0xDC7764518C0FC5a86AB5260f3af4799Ca375Fb65';

  console.log('Connecting to ProofOfExistence at:', POE_ADDRESS);
  const ProofOfExistence =
    await hre.ethers.getContractFactory('ProofOfExistence');
  const contract = ProofOfExistence.attach(POE_ADDRESS);

  // Get Total Count
  const nextId = await contract.nextExistenceId();
  console.log('Total Proofs Minted:', nextId.toString());

  if (nextId.eq(0)) {
    console.log('No proofs found.');
    return;
  }

  // Get Latest Proof
  const latestId = nextId.sub(1);
  console.log(`\nFetching Data for Latest Proof ID: ${latestId}...`);

  const existence = await contract.existences(latestId);

  console.log('---------------------------------------------------');
  console.log('Owner:       ', existence.owner);
  console.log('Duration:    ', existence.duration.toString(), 'seconds');
  console.log(
    'Timestamp:   ',
    new Date(existence.timestamp.toNumber() * 1000).toISOString()
  );
  console.log('Message:     ', existence.message);
  console.log('Metadata URI:', existence.metadataURI);
  console.log('---------------------------------------------------');

  // Decoded Arweave Link
  if (existence.metadataURI.startsWith('ar://')) {
    console.log(
      'View Metadata:',
      'https://gateway.irys.xyz/' + existence.metadataURI.slice(5)
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
