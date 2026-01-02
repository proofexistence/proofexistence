const { ethers } = require('hardhat');

async function main() {
  const TIME26_ADDRESS = '0x823a4680b90c6Ae215b5A03456B0FD38d1131c8c';
  const PROOF_RECORDER = '0xAd277E9f0f41237AEB9Cc8A6F10606b8978b9920';
  const TREASURY = '0xBDA2B288154339F88F886949F4CC9dF7D2491f6D';

  const time26 = await ethers.getContractAt('Time26', TIME26_ADDRESS);

  const recorderBalance = await time26.balanceOf(PROOF_RECORDER);
  const treasuryBalance = await time26.balanceOf(TREASURY);

  console.log(
    'ProofRecorder balance:',
    ethers.formatEther(recorderBalance),
    'TIME26'
  );
  console.log(
    'Treasury balance:',
    ethers.formatEther(treasuryBalance),
    'TIME26'
  );
}

main().catch(console.error);
