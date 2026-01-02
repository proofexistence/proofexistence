const { ethers } = require('hardhat');

async function main() {
  // TIME26 constructor: (address initialOwner)
  const time26Args = ethers.utils.defaultAbiCoder.encode(
    ['address'],
    ['0xA7D2A0647F1f12455f543Db4CaA350e85C0Eae09']
  );
  console.log('TIME26 Constructor Args (without 0x):');
  console.log(time26Args.slice(2));
  console.log('');

  // ProofRecorder constructor: (address _time26, address _treasury, address _operator, address _initialOwner)
  const proofRecorderArgs = ethers.utils.defaultAbiCoder.encode(
    ['address', 'address', 'address', 'address'],
    [
      '0x56C79b61FFc3D826188DB700791F1A7ECb007FD0', // TIME26
      '0xBDA2B288154339F88F886949F4CC9dF7D2491f6D', // Treasury
      '0x0Af9d487E8AEaf2B9d0409EDa53fA751d01aF8d1', // Operator
      '0xA7D2A0647F1f12455f543Db4CaA350e85C0Eae09', // Initial Owner (deployer)
    ]
  );
  console.log('ProofRecorder Constructor Args (without 0x):');
  console.log(proofRecorderArgs.slice(2));
}

main().catch(console.error);
