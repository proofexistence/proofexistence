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
      '0xc7b9ED3e985706efeb951462d4281f4Ac8fc99B2', // Treasury
      '0x66F5e775eDa013240c26772f79cd7b5a276850C6', // Operator
      '0xA7D2A0647F1f12455f543Db4CaA350e85C0Eae09', // Initial Owner (deployer)
    ]
  );
  console.log('ProofRecorder Constructor Args (without 0x):');
  console.log(proofRecorderArgs.slice(2));
}

main().catch(console.error);
