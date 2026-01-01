const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
// V2 API with chainid for Polygon mainnet (137)
const POLYGONSCAN_API_URL = 'https://api.etherscan.io/v2/api?chainid=137';

// Contract addresses
const TIME26_ADDRESS = '0x56C79b61FFc3D826188DB700791F1A7ECb007FD0';
const PROOF_RECORDER_ADDRESS = '0x7FF137359720f01aDcA9C524818E55ed352831DB';

// Constructor arguments (ABI encoded)
// TIME26: constructor(address initialOwner) - owner is 0xA7D2A0647F1f12455f543Db4CaA350e85C0Eae09
const TIME26_CONSTRUCTOR_ARGS = '000000000000000000000000a7d2a0647f1f12455f543db4caa350e85c0eae09';

// ProofRecorder: constructor(address _time26Token, address _treasury, address _operator, address initialOwner)
// time26: 0x56C79b61FFc3D826188DB700791F1A7ECb007FD0
// treasury: 0xc7b9ED3e985706efeb951462d4281f4Ac8fc99B2
// operator: 0x66F5e775eDa013240c26772f79cd7b5a276850C6
// initialOwner: 0xA7D2A0647F1f12455f543Db4CaA350e85C0Eae09
const PROOF_RECORDER_CONSTRUCTOR_ARGS =
  '00000000000000000000000056c79b61ffc3d826188db700791f1a7ecb007fd0' +
  '000000000000000000000000c7b9ed3e985706efeb951462d4281f4ac8fc99b2' +
  '00000000000000000000000066f5e775eda013240c26772f79cd7b5a276850c6' +
  '000000000000000000000000a7d2a0647f1f12455f543db4caa350e85c0eae09';

async function verifyContract(contractAddress, contractName, sourceCode, constructorArgs) {
  console.log(`\n=== Verifying ${contractName} at ${contractAddress} ===\n`);

  const params = new URLSearchParams({
    apikey: POLYGONSCAN_API_KEY,
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: contractAddress,
    sourceCode: sourceCode,
    codeformat: 'solidity-single-file',
    contractname: contractName,
    compilerversion: 'v0.8.27+commit.40a35a09',
    optimizationUsed: '0',
    runs: '200',
    constructorArguements: constructorArgs, // Note: PolygonScan uses this typo
    evmversion: 'paris',
    licenseType: '3', // MIT
  });

  try {
    const response = await fetch(POLYGONSCAN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));

    if (result.status === '1') {
      console.log(`✅ Verification submitted! GUID: ${result.result}`);
      console.log('Waiting 30 seconds before checking status...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      await checkVerificationStatus(result.result);
    } else {
      console.log(`❌ Verification failed: ${result.result}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function checkVerificationStatus(guid) {
  const params = new URLSearchParams({
    apikey: POLYGONSCAN_API_KEY,
    module: 'contract',
    action: 'checkverifystatus',
    guid: guid,
  });

  try {
    const response = await fetch(`${POLYGONSCAN_API_URL}&${params.toString()}`);
    const result = await response.json();
    console.log('Status:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error checking status:', error.message);
  }
}

async function main() {
  if (!POLYGONSCAN_API_KEY) {
    console.error('POLYGONSCAN_API_KEY not set in .env.local');
    process.exit(1);
  }

  // Read flattened source files
  const time26Source = fs.readFileSync('flattened/Time26.clean.sol', 'utf8');
  const proofRecorderSource = fs.readFileSync('flattened/ProofRecorder.clean.sol', 'utf8');

  console.log('Starting contract verification...');
  console.log('API Key:', POLYGONSCAN_API_KEY.substring(0, 8) + '...');

  // Verify TIME26
  await verifyContract(
    TIME26_ADDRESS,
    'Time26',
    time26Source,
    TIME26_CONSTRUCTOR_ARGS
  );

  // Verify ProofRecorder
  await verifyContract(
    PROOF_RECORDER_ADDRESS,
    'ProofRecorder',
    proofRecorderSource,
    PROOF_RECORDER_CONSTRUCTOR_ARGS
  );
}

main().catch(console.error);
