// Helper to determine network (matches poe-canvas logic)
export const isTestnet =
  process.env.NEXT_PUBLIC_IS_TESTNET === 'true' ||
  (process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_IS_TESTNET !== 'false');

// ============================================================
// Contract Addresses
// ============================================================

// Time26 Token (ERC-20)
export const TIME26_ADDRESS = isTestnet
  ? '0xdb1f87083952FF0267270E209567e52fdcC06A63' // Amoy testnet
  : '0x56C79b61FFc3D826188DB700791F1A7ECb007FD0'; // Polygon mainnet (v3 - with rewards)

// ProofRecorder (Core Logic - replaces old ProofOfExistence)
export const PROOF_RECORDER_ADDRESS = isTestnet
  ? '0xA0b6b101Cde5FeF3458C820928d1202A281001cd' // Amoy testnet (v4 - with rewards)
  : '0x72Ac729a8f6efb68A5d6765EC375aC4578a3c756'; // Polygon mainnet (v4 - new treasury/operator)

// TrailNFT (User's Personal Trails - ERC-721)
export const TRAIL_NFT_ADDRESS = isTestnet
  ? '0xDAE66367ED26661974Dd7a69cC718829d2Ea8355' // Amoy testnet
  : '0x23BA06eeD9007052c9f95f7dC8E92B825399aAa1'; // Polygon mainnet (v2 - secured)

// SnapshotNFT (Official Cosmos Snapshots - ERC-721)
export const SNAPSHOT_NFT_ADDRESS = isTestnet
  ? '0x2A93dB42D9b45EA136C2e9903f962cFF85097F16' // Amoy testnet
  : '0x994b45d12DE1Cdf812d1302417F5c9DFab3E1a3C'; // Polygon mainnet (v2 - secured)

// Legacy alias for backward compatibility
export const PROOF_OF_EXISTENCE_ADDRESS = PROOF_RECORDER_ADDRESS;

// ============================================================
// Contract ABIs
// ============================================================

export const PROOF_RECORDER_ABI = [
  // Minting
  'function mintInstantNative(uint256 duration, string memory metadataURI, string memory displayName, string memory message) external payable',
  'function mintInstantTime26(uint256 duration, string memory metadataURI, string memory displayName, string memory message) external',
  'function mintSponsoredNative(uint256 duration, string memory metadataURI, string memory displayName, string memory message, address recipient) external',
  // Legacy function names (backward compatible)
  'function mintEternalNative(uint256 duration, string memory metadataURI, string memory displayName, string memory message) external payable',
  'function mintEternalTime26(uint256 duration, string memory metadataURI, string memory displayName, string memory message) external',
  // Pricing
  'function calculateCostNative(uint256 duration) public view returns (uint256)',
  'function calculateCostTime26(uint256 duration) public view returns (uint256)',
  'function baseFeeNative() public view returns (uint256)',
  'function pricePerSecondNative() public view returns (uint256)',
  'function baseFeeTime26() public view returns (uint256)',
  'function pricePerSecondTime26() public view returns (uint256)',
  'function freeAllowance() public view returns (uint256)',
  // Config
  'function treasury() public view returns (address)',
  'function time26Token() public view returns (address)',
  'function trailNFT() public view returns (address)',
  'function deflationMode() public view returns (bool)',
  // Batch proof (for cron settle)
  'function emitBatchProof(bytes32 merkleRoot, string memory arweaveCid) external',
  'function storeMerkleRoot(uint256 day, bytes32 root) external',
  // Reward distribution
  'function setRewardsMerkleRoot(bytes32 newRoot) external',
  'function burnForRewards(uint256 amount, string calldata reason) external',
  'function claimRewards(uint256 cumulativeAmount, bytes32[] calldata proof) external',
  'function getClaimableRewards(address user, uint256 cumulativeAmount) external view returns (uint256)',
  'function totalClaimed(address user) external view returns (uint256)',
  'function rewardsMerkleRoot() external view returns (bytes32)',
  // Emergency
  'function emergencyWithdrawERC20(address token, address to, uint256 amount) external',
  // Events
  'event ExistenceMinted(uint256 indexed id, address indexed owner, uint256 duration, string metadataURI, string displayName, string message, uint256 nftTokenId)',
  'event BatchProofEmitted(bytes32 indexed merkleRoot, string arweaveCid)',
  'event RewardsClaimedV2(address indexed user, uint256 amount, uint256 totalClaimed)',
  'event RewardsBurned(uint256 amount, string reason)',
  'event RewardsMerkleRootUpdated(bytes32 oldRoot, bytes32 newRoot)',
];

// Legacy alias
export const PROOF_OF_EXISTENCE_ABI = PROOF_RECORDER_ABI;

export const TIME26_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  'function totalSupply() public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'function symbol() public view returns (string)',
  'function name() public view returns (string)',
  'function burnFrom(address account, uint256 amount) external',
];

export const TRAIL_NFT_ABI = [
  // ERC-721 Standard
  'function balanceOf(address owner) public view returns (uint256)',
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)',
  'function tokenURI(uint256 tokenId) public view returns (string)',
  'function totalSupply() public view returns (uint256)',
  'function name() public view returns (string)',
  'function symbol() public view returns (string)',
  // Custom functions
  'function getTokenInfo(uint256 tokenId) public view returns (address owner, address creator, string arweaveHash, uint256 timestamp, uint256 duration)',
  'function tokenArweaveHash(uint256 tokenId) public view returns (string)',
  'function tokenCreator(uint256 tokenId) public view returns (address)',
  'function tokenTimestamp(uint256 tokenId) public view returns (uint256)',
  'function tokenDuration(uint256 tokenId) public view returns (uint256)',
  // EIP-2981 Royalty
  'function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount)',
  // Events
  'event TrailMinted(address indexed to, uint256 indexed tokenId, string arweaveHash, uint256 duration)',
];

export const SNAPSHOT_NFT_ABI = [
  // ERC-721 Standard
  'function balanceOf(address owner) public view returns (uint256)',
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)',
  'function tokenURI(uint256 tokenId) public view returns (string)',
  'function totalSupply() public view returns (uint256)',
  'function name() public view returns (string)',
  'function symbol() public view returns (string)',
  // Custom functions
  'function getSnapshotInfo(uint256 tokenId) public view returns (address owner, string arweaveHash, uint8 snapshotType, uint256 timestamp, string description)',
  'function mint(address to, string calldata arweaveHash, uint8 snapshotType, uint256 timestamp, string calldata description) external returns (uint256)',
  'function mintBatch(address to, string[] calldata arweaveHashes, uint8[] calldata snapshotTypes, uint256[] calldata timestamps, string[] calldata descriptions) external',
  // EIP-2981 Royalty
  'function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount)',
  // Events
  'event SnapshotMinted(address indexed to, uint256 indexed tokenId, uint8 snapshotType, uint256 timestamp, string arweaveHash)',
];

// DaisyChronicles Genesis (ERC-721, 1/1 Auctions)
export const DAISY_GENESIS_ADDRESS = isTestnet
  ? '0x3cE4838b41A95292954836B31435836F1c994FC7' // Amoy testnet
  : '0x0000000000000000000000000000000000000000'; // TODO: Deploy to mainnet

// DaisyChronicles Standard (ERC-1155, Unlimited Editions)
export const DAISY_STANDARD_ADDRESS = isTestnet
  ? '0xa5aaf62952ECfB6cDe729b81b37c8BE826a811B4' // Amoy testnet
  : '0x0000000000000000000000000000000000000000'; // TODO: Deploy to mainnet

export const DAISY_GENESIS_ABI = [
  // Auction
  'function createAuction(uint256 date, uint256 startPrice, string calldata metadataURI, uint256 participantCount, uint256 sessionCount) external',
  'function bid(uint256 date) external payable',
  'function settleAuction(uint256 date) external',
  'function getAuctionInfo(uint256 date) external view returns (uint256 startPrice, uint256 currentBid, address highestBidder, uint256 endTime, bool settled, uint256 minNextBid, bool isActive)',
  'function getDaisyData(uint256 tokenId) external view returns (uint256 date, string memory metadataURI, uint256 participantCount, uint256 sessionCount)',
  // ERC-721
  'function balanceOf(address owner) public view returns (uint256)',
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'function tokenURI(uint256 tokenId) public view returns (string)',
  'function totalSupply() public view returns (uint256)',
  // Admin
  'function pause() external',
  'function unpause() external',
  // Events
  'event AuctionCreated(uint256 indexed date, uint256 startPrice, uint256 endTime, string metadataURI)',
  'event BidPlaced(uint256 indexed date, address indexed bidder, uint256 amount)',
  'event AuctionSettled(uint256 indexed date, uint256 indexed tokenId, address winner, uint256 amount)',
  'event AuctionExtended(uint256 indexed date, uint256 newEndTime)',
];

export const DAISY_STANDARD_ABI = [
  // Config
  'function setDailyConfig(uint256 date, string calldata metadataURI, bytes32 participantRoot, uint256 participantCount, uint8 quarter, uint256 dateMultiplierBps, uint256 startTime, uint256 endTime) external',
  // Pricing
  'function getPrice(uint256 date) public view returns (uint256)',
  'function quarterBasePrices(uint8 quarter) public view returns (uint256)',
  // Minting
  'function mint(uint256 date) external payable',
  'function mintFree(uint256 date, bytes32[] calldata proof) external',
  // Views
  'function getDailyInfo(uint256 date) external view returns (string memory metadataURI, uint256 participantCount, uint256 mintCount, uint256 currentPrice, bool active)',
  'function canMintFree(uint256 date, address user) external view returns (bool)',
  'function canMintPaid(uint256 date, address user) external view returns (bool)',
  'function hasClaimedFree(uint256 date, address user) external view returns (bool)',
  'function hasMintedPaid(uint256 date, address user) external view returns (bool)',
  // ERC-1155
  'function balanceOf(address account, uint256 id) public view returns (uint256)',
  'function uri(uint256 id) public view returns (string)',
  // Admin
  'function setDailyActive(uint256 date, bool active) external',
  'function pause() external',
  'function unpause() external',
  // Events
  'event DailyConfigSet(uint256 indexed date, string metadataURI, uint256 participantCount)',
  'event StandardMinted(uint256 indexed date, address indexed minter, bool isFree, uint256 price)',
];

// ============================================================
// Chain Configuration
// ============================================================

export const CHAIN_ID = isTestnet ? 80002 : 137;

export const RPC_URL = isTestnet
  ? 'https://rpc-amoy.polygon.technology'
  : 'https://polygon-rpc.com';

export const BLOCK_EXPLORER = isTestnet
  ? 'https://amoy.polygonscan.com'
  : 'https://polygonscan.com';
