const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
// V2 API with chainid for Polygon mainnet (137)
const POLYGONSCAN_API_URL = 'https://api.etherscan.io/v2/api?chainid=137';

// Contract addresses
const TIME26_ADDRESS = '0x56C79b61FFc3D826188DB700791F1A7ECb007FD0';
const PROOF_RECORDER_ADDRESS = '0x72Ac729a8f6efb68A5d6765EC375aC4578a3c756';

// Constructor arguments (ABI encoded)
// TIME26: constructor(address initialOwner) - owner is 0xA7D2A0647F1f12455f543Db4CaA350e85C0Eae09
const TIME26_CONSTRUCTOR_ARGS =
  '000000000000000000000000a7d2a0647f1f12455f543db4caa350e85c0eae09';

// ProofRecorder: constructor(address _time26Token, address _treasury, address _operator, address initialOwner)
// time26: 0x56C79b61FFc3D826188DB700791F1A7ECb007FD0
// treasury: 0xBDA2B288154339F88F886949F4CC9dF7D2491f6D
// operator: 0x0Af9d487E8AEaf2B9d0409EDa53fA751d01aF8d1
// initialOwner: 0xA7D2A0647F1f12455f543Db4CaA350e85C0Eae09
const PROOF_RECORDER_CONSTRUCTOR_ARGS =
  '00000000000000000000000056c79b61ffc3d826188db700791f1a7ecb007fd0' +
  '000000000000000000000000bda2b288154339f88f886949f4cc9df7d2491f6d' +
  '0000000000000000000000000af9d487e8aeaf2b9d0409eda53fa751d01af8d1' +
  '000000000000000000000000a7d2a0647f1f12455f543db4caa350e85c0eae09';

async function verifyContract(
  contractAddress,
  contractName,
  sourceCode,
  constructorArgs
) {
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
      await new Promise((resolve) => setTimeout(resolve, 30000));
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
  const proofRecorderSource = fs.readFileSync(
    'flattened/ProofRecorder.clean.sol',
    'utf8'
  );

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
