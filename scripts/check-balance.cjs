const hre = require('hardhat');

async function main() {
  const time26Address = '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82'; // From previous deployment
  const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  const Time26 = await hre.ethers.getContractFactory('Time26');
  const time26 = await Time26.attach(time26Address);

  const balance = await time26.balanceOf(userAddress);
  console.log(
    `Balance of ${userAddress}: ${hre.ethers.utils.formatEther(balance)} TIME26`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
