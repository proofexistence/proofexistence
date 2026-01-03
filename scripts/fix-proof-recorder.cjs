const { ethers } = require('hardhat');

async function main() {
  const [signer] = await ethers.getSigners();
  console.log('Signer:', signer.address);

  const proofRecorder = await ethers.getContractAt(
    ['function setTrailNFT(address _trailNFT) external', 'function trailNFT() view returns (address)'],
    '0x72Ac729a8f6efb68A5d6765EC375aC4578a3c756'
  );

  console.log('Current trailNFT:', await proofRecorder.trailNFT());
  console.log('Setting trailNFT to 0x23BA06eeD9007052c9f95f7dC8E92B825399aAa1...');

  const tx = await proofRecorder.setTrailNFT('0x23BA06eeD9007052c9f95f7dC8E92B825399aAa1');
  await tx.wait();

  console.log('✅ Done! Tx:', tx.hash);
  console.log('New trailNFT:', await proofRecorder.trailNFT());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
