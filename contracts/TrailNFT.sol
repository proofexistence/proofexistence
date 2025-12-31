// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/**
 * @title TrailNFT
 * @notice ERC-721 NFT for user light trails (POE2026 - Trails)
 * @dev Each NFT represents a unique user creation, tradeable on marketplaces
 */
contract TrailNFT is ERC721, ERC721Enumerable, IERC2981, Ownable {
    // --- State Variables ---

    /// @notice Address authorized to mint NFTs (ProofRecorder contract)
    address public minter;

    /// @notice Token ID counter
    uint256 private _tokenIdCounter;

    /// @notice Token ID => Arweave transaction hash
    mapping(uint256 => string) public tokenArweaveHash;

    /// @notice Token ID => Original creator address
    mapping(uint256 => address) public tokenCreator;

    /// @notice Token ID => Creation timestamp
    mapping(uint256 => uint256) public tokenTimestamp;

    /// @notice Token ID => Duration in seconds
    mapping(uint256 => uint256) public tokenDuration;

    /// @notice Royalty receiver address
    address public royaltyReceiver;

    /// @notice Royalty basis points (500 = 5%)
    uint96 public royaltyBps = 500;

    /// @notice Base URI for metadata
    string private _baseTokenURI;

    /// @notice Pause state
    bool public paused;

    // --- Events ---

    event TrailMinted(
        address indexed to,
        uint256 indexed tokenId,
        string arweaveHash,
        uint256 duration
    );
    event MinterUpdated(address indexed oldMinter, address indexed newMinter);
    event RoyaltyUpdated(address indexed receiver, uint96 bps);
    event Paused(address account);
    event Unpaused(address account);

    // --- Modifiers ---

    modifier onlyMinter() {
        require(msg.sender == minter, "TrailNFT: caller is not minter");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "TrailNFT: paused");
        _;
    }

    // --- Constructor ---

    constructor(
        address _royaltyReceiver,
        address _initialOwner
    ) ERC721("POE2026 - Trails", "TRAIL") Ownable(_initialOwner) {
        require(_royaltyReceiver != address(0), "TrailNFT: invalid royalty receiver");
        royaltyReceiver = _royaltyReceiver;
        _baseTokenURI = "https://arweave.net/";
    }

    // --- Minting ---

    /**
     * @notice Mint a new Trail NFT
     * @param to Recipient address
     * @param arweaveHash Arweave transaction ID for metadata
     * @param duration Duration of the trail in seconds
     * @return tokenId The newly minted token ID
     */
    function mint(
        address to,
        string calldata arweaveHash,
        uint256 duration
    ) external onlyMinter whenNotPaused returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;

        _safeMint(to, tokenId);

        tokenArweaveHash[tokenId] = arweaveHash;
        tokenCreator[tokenId] = to;
        tokenTimestamp[tokenId] = block.timestamp;
        tokenDuration[tokenId] = duration;

        emit TrailMinted(to, tokenId, arweaveHash, duration);

        return tokenId;
    }

    // --- Views ---

    /**
     * @notice Get token metadata URI
     * @param tokenId Token ID to query
     * @return URI string pointing to Arweave metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "TrailNFT: nonexistent token");
        return string(abi.encodePacked(_baseTokenURI, tokenArweaveHash[tokenId]));
    }

    /**
     * @notice Get full token info
     * @param tokenId Token ID to query
     */
    function getTokenInfo(uint256 tokenId) external view returns (
        address owner,
        address creator,
        string memory arweaveHash,
        uint256 timestamp,
        uint256 duration
    ) {
        require(_ownerOf(tokenId) != address(0), "TrailNFT: nonexistent token");
        return (
            ownerOf(tokenId),
            tokenCreator[tokenId],
            tokenArweaveHash[tokenId],
            tokenTimestamp[tokenId],
            tokenDuration[tokenId]
        );
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

    function setMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "TrailNFT: invalid minter address");
        emit MinterUpdated(minter, _minter);
        minter = _minter;
    }

    function setRoyalty(address _receiver, uint96 _bps) external onlyOwner {
        require(_receiver != address(0), "TrailNFT: invalid receiver address");
        require(_bps <= 1000, "TrailNFT: royalty too high"); // Max 10%
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
