/**
 * Test NFT minting through ProofRecorder
 * Run: npx tsx scripts/test-nft-mint.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { ethers } from 'ethers';

// NEW contract addresses
const PROOF_RECORDER_ADDRESS = '0xd8ec22eaed3DA06592b31c3F7e95a68a2d96e78A';
const TRAIL_NFT_ADDRESS = '0xDAE66367ED26661974Dd7a69cC718829d2Ea8355';
const TIME26_ADDRESS = '0xdb1f87083952FF0267270E209567e52fdcC06A63';

const PROOF_RECORDER_ABI = [
  'function mintInstantNative(uint256 duration, string memory metadataURI, string memory displayName, string memory message) external payable',
  'function mintInstantTime26(uint256 duration, string memory metadataURI, string memory displayName, string memory message) external',
  'function calculateCostNative(uint256 duration) public view returns (uint256)',
  'function calculateCostTime26(uint256 duration) public view returns (uint256)',
  'function trailNFT() public view returns (address)',
  'function existences(uint256) public view returns (address owner, uint256 duration, uint256 timestamp, string metadataURI, string displayName, string message, uint256 nftTokenId)',
  'event ExistenceMinted(uint256 indexed id, address indexed owner, uint256 duration, string metadataURI, string displayName, string message, uint256 nftTokenId)',
];

const TRAIL_NFT_ABI = [
  'function balanceOf(address owner) public view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)',
  'function tokenURI(uint256 tokenId) public view returns (string)',
  'function getTokenInfo(uint256 tokenId) public view returns (address owner, address creator, string arweaveHash, uint256 timestamp, uint256 duration)',
  'function totalSupply() public view returns (uint256)',
  'function name() public view returns (string)',
  'function symbol() public view returns (string)',
];

const TIME26_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function balanceOf(address account) public view returns (uint256)',
  'function allowance(address owner, address spender) public view returns (uint256)',
];

async function main() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    console.error(
      '❌ Missing NEXT_PUBLIC_RPC_URL or PRIVATE_KEY in .env.local'
    );
    process.exit(1);
  }

  console.log('🚀 Testing NFT Minting through ProofRecorder\n');
  console.log('━'.repeat(50));

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`📍 Wallet: ${wallet.address}`);
  console.log(`📍 ProofRecorder: ${PROOF_RECORDER_ADDRESS}`);
  console.log(`📍 TrailNFT: ${TRAIL_NFT_ADDRESS}`);
  console.log('━'.repeat(50));

  const proofRecorder = new ethers.Contract(
    PROOF_RECORDER_ADDRESS,
    PROOF_RECORDER_ABI,
    wallet
  );
  const trailNFT = new ethers.Contract(
    TRAIL_NFT_ADDRESS,
    TRAIL_NFT_ABI,
    provider
  );
  const time26 = new ethers.Contract(TIME26_ADDRESS, TIME26_ABI, wallet);

  // Check NFT contract info
  console.log('\n📊 Step 1: Checking TrailNFT contract...');
  const nftName = await trailNFT.name();
  const nftSymbol = await trailNFT.symbol();
  const totalSupply = await trailNFT.totalSupply();
  console.log(`   Name: ${nftName}`);
  console.log(`   Symbol: ${nftSymbol}`);
  console.log(`   Total Supply: ${totalSupply.toString()}`);

  // Check linked TrailNFT
  const linkedTrailNFT = await proofRecorder.trailNFT();
  console.log(`   Linked in ProofRecorder: ${linkedTrailNFT}`);

  // Check initial NFT balance
  const initialNFTBalance = await trailNFT.balanceOf(wallet.address);
  console.log(`   Your NFT balance: ${initialNFTBalance.toString()}`);

  // Calculate cost
  const testDuration = 60;
  console.log(`\n📊 Step 2: Calculating cost for ${testDuration}s...`);
  const costNative = await proofRecorder.calculateCostNative(testDuration);
  console.log(`   POL Cost: ${ethers.utils.formatEther(costNative)} POL`);

  // Mint with POL
  console.log('\n📊 Step 3: Minting with POL...');
  const testMetadata = `test-nft-${Date.now()}`;
  const testDisplayName = 'NFT Test User';
  const testMessage = 'Testing NFT minting!';

  console.log(`   Duration: ${testDuration}s`);
  console.log(`   Metadata: ${testMetadata}`);
  console.log(`   Display Name: ${testDisplayName}`);
  console.log(`   Message: ${testMessage}`);

  try {
    const gasPrice = await provider.getGasPrice();
    const adjustedGasPrice = gasPrice.mul(150).div(100);

    const mintTx = await proofRecorder.mintInstantNative(
      testDuration,
      testMetadata,
      testDisplayName,
      testMessage,
      {
        value: costNative,
        gasLimit: 500000,
        gasPrice: adjustedGasPrice,
      }
    );
    console.log(`   TX: ${mintTx.hash}`);
    console.log('   Waiting for confirmation...');

    const receipt = await mintTx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);

    // Parse events
    const mintEvent = receipt.events?.find(
      (e: ethers.Event) => e.event === 'ExistenceMinted'
    );
    if (mintEvent && mintEvent.args) {
      console.log(`\n🎉 Existence Minted!`);
      console.log(`   Existence ID: ${mintEvent.args.id.toString()}`);
      console.log(`   NFT Token ID: ${mintEvent.args.nftTokenId.toString()}`);
      console.log(`   Owner: ${mintEvent.args.owner}`);
      console.log(`   Duration: ${mintEvent.args.duration.toString()}s`);

      // Get NFT info
      const nftTokenId = mintEvent.args.nftTokenId;
      if (nftTokenId.gt(0) || nftTokenId.eq(0)) {
        console.log('\n📊 Step 4: Verifying NFT...');
        const tokenInfo = await trailNFT.getTokenInfo(nftTokenId);
        console.log(`   NFT Owner: ${tokenInfo.owner}`);
        console.log(`   NFT Creator: ${tokenInfo.creator}`);
        console.log(`   Arweave Hash: ${tokenInfo.arweaveHash}`);
        console.log(`   Duration: ${tokenInfo.duration.toString()}s`);

        const tokenURI = await trailNFT.tokenURI(nftTokenId);
        console.log(`   Token URI: ${tokenURI}`);
      }
    }

    // Check new NFT balance
    const newNFTBalance = await trailNFT.balanceOf(wallet.address);
    console.log(
      `\n💎 NFT Balance: ${initialNFTBalance.toString()} → ${newNFTBalance.toString()}`
    );

    console.log('\n━'.repeat(50));
    console.log('✅ NFT Minting Test PASSED!');
    console.log('━'.repeat(50));

    console.log(`\n🔗 View NFT on OpenSea (Amoy):`);
    console.log(
      `   https://testnets.opensea.io/assets/amoy/${TRAIL_NFT_ADDRESS}/0`
    );

    console.log(`\n🔗 View on PolygonScan:`);
    console.log(`   https://amoy.polygonscan.com/tx/${mintTx.hash}`);
  } catch (error: unknown) {
    console.error('\n❌ Mint failed:', error);
    if (error instanceof Error && 'reason' in error) {
      console.error('   Reason:', (error as { reason: string }).reason);
    }
    process.exit(1);
  }
}

main().catch(console.error);
