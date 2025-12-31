// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/**
 * @title SnapshotNFT
 * @notice ERC-721 NFT for official cosmos snapshots (POE2026 - Chronicles)
 * @dev Limited edition snapshots of the collective canvas, only operator can mint
 */
contract SnapshotNFT is ERC721, ERC721Enumerable, IERC2981, Ownable {
    // --- Enums ---

    enum SnapshotType {
        HOURLY,
        DAILY,
        WEEKLY,
        MONTHLY,
        SPECIAL
    }

    // --- Structs ---

    struct SnapshotData {
        string arweaveHash;
        SnapshotType snapshotType;
        uint256 timestamp;
        string description;
    }

    // --- State Variables ---

    /// @notice Address authorized to mint official snapshots (Operator wallet)
    address public operator;

    /// @notice Token ID counter
    uint256 private _tokenIdCounter;

    /// @notice Token ID => Snapshot data
    mapping(uint256 => SnapshotData) public snapshots;

    /// @notice Royalty receiver address
    address public royaltyReceiver;

    /// @notice Royalty basis points (500 = 5%)
    uint96 public royaltyBps = 500;

    /// @notice Base URI for metadata
    string private _baseTokenURI;

    /// @notice Pause state
    bool public paused;

    // --- Events ---

    event SnapshotMinted(
        address indexed to,
        uint256 indexed tokenId,
        SnapshotType snapshotType,
        uint256 timestamp,
        string arweaveHash
    );
    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);
    event RoyaltyUpdated(address indexed receiver, uint96 bps);
    event Paused(address account);
    event Unpaused(address account);

    // --- Modifiers ---

    modifier onlyOperator() {
        require(msg.sender == operator, "SnapshotNFT: caller is not operator");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "SnapshotNFT: paused");
        _;
    }

    // --- Constructor ---

    constructor(
        address _operator,
        address _royaltyReceiver,
        address _initialOwner
    ) ERC721("POE2026 - Chronicles", "CHRONICLE") Ownable(_initialOwner) {
        require(_operator != address(0), "SnapshotNFT: invalid operator address");
        require(_royaltyReceiver != address(0), "SnapshotNFT: invalid royalty receiver");
        operator = _operator;
        royaltyReceiver = _royaltyReceiver;
        _baseTokenURI = "https://arweave.net/";
    }

    // --- Minting ---

    /**
     * @notice Mint a new Snapshot NFT
     * @param to Recipient address
     * @param arweaveHash Arweave transaction ID for metadata
     * @param snapshotType Type of snapshot (hourly, daily, weekly, monthly, special)
     * @param timestamp Unix timestamp of the snapshot
     * @param description Optional description
     * @return tokenId The newly minted token ID
     */
    function mint(
        address to,
        string calldata arweaveHash,
        SnapshotType snapshotType,
        uint256 timestamp,
        string calldata description
    ) external onlyOperator whenNotPaused returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;

        _safeMint(to, tokenId);

        snapshots[tokenId] = SnapshotData({
            arweaveHash: arweaveHash,
            snapshotType: snapshotType,
            timestamp: timestamp,
            description: description
        });

        emit SnapshotMinted(to, tokenId, snapshotType, timestamp, arweaveHash);

        return tokenId;
    }

    /**
     * @notice Batch mint multiple Snapshot NFTs (gas efficient)
     * @param to Recipient address for all NFTs
     * @param arweaveHashes Array of Arweave transaction IDs
     * @param snapshotTypes Array of snapshot types
     * @param timestamps Array of timestamps
     * @param descriptions Array of descriptions
     */
    /// @notice Maximum items per batch to prevent gas limit issues
    uint256 public constant MAX_BATCH_SIZE = 50;

    function mintBatch(
        address to,
        string[] calldata arweaveHashes,
        SnapshotType[] calldata snapshotTypes,
        uint256[] calldata timestamps,
        string[] calldata descriptions
    ) external onlyOperator whenNotPaused {
        require(arweaveHashes.length <= MAX_BATCH_SIZE, "SnapshotNFT: batch too large");
        require(
            arweaveHashes.length == snapshotTypes.length &&
            snapshotTypes.length == timestamps.length &&
            timestamps.length == descriptions.length,
            "SnapshotNFT: array length mismatch"
        );

        for (uint256 i = 0; i < arweaveHashes.length; i++) {
            uint256 tokenId = _tokenIdCounter++;

            _safeMint(to, tokenId);

            snapshots[tokenId] = SnapshotData({
                arweaveHash: arweaveHashes[i],
                snapshotType: snapshotTypes[i],
                timestamp: timestamps[i],
                description: descriptions[i]
            });

            emit SnapshotMinted(to, tokenId, snapshotTypes[i], timestamps[i], arweaveHashes[i]);
        }
    }

    // --- Views ---

    /**
     * @notice Get token metadata URI
     * @param tokenId Token ID to query
     * @return URI string pointing to Arweave metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "SnapshotNFT: nonexistent token");
        return string(abi.encodePacked(_baseTokenURI, snapshots[tokenId].arweaveHash));
    }

    /**
     * @notice Get full snapshot info
     * @param tokenId Token ID to query
     */
    function getSnapshotInfo(uint256 tokenId) external view returns (
        address owner,
        string memory arweaveHash,
        SnapshotType snapshotType,
        uint256 timestamp,
        string memory description
    ) {
        require(_ownerOf(tokenId) != address(0), "SnapshotNFT: nonexistent token");
        SnapshotData memory data = snapshots[tokenId];
        return (
            ownerOf(tokenId),
            data.arweaveHash,
            data.snapshotType,
            data.timestamp,
            data.description
        );
    }

    /**
     * @notice Get snapshot type as string
     * @param snapshotType Enum value
     */
    function getSnapshotTypeName(SnapshotType snapshotType) public pure returns (string memory) {
        if (snapshotType == SnapshotType.HOURLY) return "hourly";
        if (snapshotType == SnapshotType.DAILY) return "daily";
        if (snapshotType == SnapshotType.WEEKLY) return "weekly";
        if (snapshotType == SnapshotType.MONTHLY) return "monthly";
        return "special";
    }

    // --- EIP-2981 Royalty ---

    /**
     * @notice Returns royalty info for a sale
     * @param salePrice The sale price
     * @return receiver Royalty recipient
     * @return royaltyAmount Amount to pay
     */
    function royaltyInfo(
        uint256 /* tokenId */,
        uint256 salePrice
    ) external view override returns (address receiver, uint256 royaltyAmount) {
        return (royaltyReceiver, (salePrice * royaltyBps) / 10000);
    }

    // --- Admin Functions ---

    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "SnapshotNFT: invalid operator address");
        emit OperatorUpdated(operator, _operator);
        operator = _operator;
    }

    function setRoyalty(address _receiver, uint96 _bps) external onlyOwner {
        require(_receiver != address(0), "SnapshotNFT: invalid receiver address");
        require(_bps <= 1000, "SnapshotNFT: royalty too high"); // Max 10%
        royaltyReceiver = _receiver;
        royaltyBps = _bps;
        emit RoyaltyUpdated(_receiver, _bps);
    }

    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // --- Required Overrides ---

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable, IERC165) returns (bool) {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
