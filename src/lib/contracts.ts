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
  : '0x823a4680b90c6Ae215b5A03456B0FD38d1131c8c'; // Polygon mainnet (v2 - secured)

// ProofRecorder (Core Logic - replaces old ProofOfExistence)
export const PROOF_RECORDER_ADDRESS = isTestnet
  ? '0xd8ec22eaed3DA06592b31c3F7e95a68a2d96e78A' // Amoy testnet
  : '0xAd277E9f0f41237AEB9Cc8A6F10606b8978b9920'; // Polygon mainnet (v2 - secured)

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
  // Events
  'event ExistenceMinted(uint256 indexed id, address indexed owner, uint256 duration, string metadataURI, string displayName, string message, uint256 nftTokenId)',
  'event BatchProofEmitted(bytes32 indexed merkleRoot, string arweaveCid)',
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
