import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
const contract = new ethers.Contract(
  '0x72Ac729a8f6efb68A5d6765EC375aC4578a3c756',
  [
    'function baseFeeNative() public view returns (uint256)',
    'function pricePerSecondNative() public view returns (uint256)',
    'function baseFeeTime26() public view returns (uint256)',
    'function pricePerSecondTime26() public view returns (uint256)',
    'function freeAllowance() public view returns (uint256)',
    'function calculateCostNative(uint256 duration) public view returns (uint256)',
    'function calculateCostTime26(uint256 duration) public view returns (uint256)',
    'function owner() public view returns (address)',
    'function operator() public view returns (address)',
    'function treasury() public view returns (address)',
  ],
  provider
);

async function main() {
  const owner = await contract.owner();
  const operator = await contract.operator();
  const treasury = await contract.treasury();

  console.log('=== Contract Roles ===');
  console.log('Owner:', owner);
  console.log('Operator:', operator);
  console.log('Treasury:', treasury);
  console.log('');

  const baseFeeNative = await contract.baseFeeNative();
  const pricePerSecondNative = await contract.pricePerSecondNative();
  const baseFeeTime26 = await contract.baseFeeTime26();
  const pricePerSecondTime26 = await contract.pricePerSecondTime26();
  const freeAllowance = await contract.freeAllowance();
  const cost60s = await contract.calculateCostNative(60);
  const cost120s = await contract.calculateCostNative(120);

  console.log('=== ProofRecorder v4 Pricing (Mainnet) ===');
  console.log('baseFeeNative:', ethers.formatEther(baseFeeNative), 'POL');
  console.log('pricePerSecondNative:', ethers.formatEther(pricePerSecondNative), 'POL');
  console.log('baseFeeTime26:', ethers.formatEther(baseFeeTime26), 'TIME');
  console.log('pricePerSecondTime26:', ethers.formatEther(pricePerSecondTime26), 'TIME');
  console.log('freeAllowance:', freeAllowance.toString(), 'seconds');
  console.log('');
  console.log('=== Example Costs ===');
  console.log('60 seconds:', ethers.formatEther(cost60s), 'POL');
  console.log('120 seconds:', ethers.formatEther(cost120s), 'POL');
}

main().catch(console.error);
