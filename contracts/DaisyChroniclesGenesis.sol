// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DaisyChroniclesGenesis
 * @notice ERC-721 contract for Genesis (1/1) Daisy NFTs with English auction functionality
 * @dev Each token represents a unique daily Daisy artwork created from community participation
 */
contract DaisyChroniclesGenesis is ERC721, ERC721Enumerable, Ownable, IERC2981, ReentrancyGuard {
    // --- Constants ---
    uint256 public constant MIN_BID_INCREMENT_BPS = 1000; // 10%
    uint256 public constant AUCTION_DURATION = 24 hours;
    uint256 public constant EXTENSION_DURATION = 10 minutes;
    uint256 public constant EXTENSION_THRESHOLD = 10 minutes;

    // --- Structs ---
    struct Auction {
        uint256 startPrice;
        uint256 currentBid;
        address highestBidder;
        uint256 endTime;
        bool settled;
        string metadataURI;
    }

    struct DaisyData {
        uint256 date;
        string metadataURI;
        uint256 participantCount;
        uint256 sessionCount;
    }

    // --- State Variables ---
    address public operator;
    address public treasury;
    uint256 private _tokenIdCounter;

    mapping(uint256 => Auction) public auctions; // date => Auction
    mapping(uint256 => uint256) public dateToTokenId; // date => tokenId
    mapping(uint256 => DaisyData) public daisies; // tokenId => DaisyData

    address public royaltyReceiver;
    uint256 public royaltyBps; // 500 = 5%

    bool public paused;

    // --- Events ---
    event AuctionCreated(uint256 indexed date, uint256 startPrice, uint256 endTime, string metadataURI);
    event BidPlaced(uint256 indexed date, address indexed bidder, uint256 amount);
    event AuctionSettled(uint256 indexed date, uint256 indexed tokenId, address indexed winner, uint256 amount);
    event AuctionExtended(uint256 indexed date, uint256 newEndTime);
    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event RoyaltyUpdated(address indexed receiver, uint256 bps);
    event Paused(bool isPaused);

    // --- Modifiers ---
    modifier onlyOperator() {
        require(msg.sender == operator, "DaisyGenesis: caller is not operator");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "DaisyGenesis: contract is paused");
        _;
    }

    // --- Constructor ---
    constructor(
        address _operator,
        address _treasury,
        address _royaltyReceiver,
        uint256 _royaltyBps,
        address _initialOwner
    ) ERC721("Daisy Chronicles - Genesis", "DAISY-G") Ownable(_initialOwner) {
        require(_operator != address(0), "DaisyGenesis: invalid operator");
        require(_treasury != address(0), "DaisyGenesis: invalid treasury");
        require(_royaltyReceiver != address(0), "DaisyGenesis: invalid royalty receiver");
        require(_royaltyBps <= 1000, "DaisyGenesis: royalty too high"); // Max 10%

        operator = _operator;
        treasury = _treasury;
        royaltyReceiver = _royaltyReceiver;
        royaltyBps = _royaltyBps;
    }

    // --- Auction Functions ---

    /**
     * @notice Create a new auction for a specific date
     * @param date The date identifier (e.g., YYYYMMDD format as uint256)
     * @param startPrice The minimum starting price for the auction
     * @param metadataURI The metadata URI for the NFT
     * @param participantCount Number of participants in the daily drawing
     * @param sessionCount Number of sessions in the daily drawing
     */
    function createAuction(
        uint256 date,
        uint256 startPrice,
        string calldata metadataURI,
        uint256 participantCount,
        uint256 sessionCount
    ) external onlyOperator whenNotPaused {
        require(auctions[date].endTime == 0, "DaisyGenesis: auction already exists");
        require(bytes(metadataURI).length > 0, "DaisyGenesis: empty metadata URI");

        uint256 endTime = block.timestamp + AUCTION_DURATION;

        auctions[date] = Auction({
            startPrice: startPrice,
            currentBid: 0,
            highestBidder: address(0),
            endTime: endTime,
            settled: false,
            metadataURI: metadataURI
        });

        // Store DaisyData for the next token (will be assigned on settlement)
        uint256 nextTokenId = _tokenIdCounter;
        daisies[nextTokenId] = DaisyData({
            date: date,
            metadataURI: metadataURI,
            participantCount: participantCount,
            sessionCount: sessionCount
        });

        emit AuctionCreated(date, startPrice, endTime, metadataURI);
    }

    /**
     * @notice Place a bid on an active auction
     * @param date The date identifier of the auction
     */
    function bid(uint256 date) external payable nonReentrant whenNotPaused {
        Auction storage auction = auctions[date];

        require(auction.endTime > 0, "DaisyGenesis: auction does not exist");
        require(block.timestamp < auction.endTime, "DaisyGenesis: auction has ended");
        require(!auction.settled, "DaisyGenesis: auction already settled");

        uint256 minBid = _getMinBid(auction);
        require(msg.value >= minBid, "DaisyGenesis: bid too low");

        // Refund previous bidder
        address previousBidder = auction.highestBidder;
        uint256 previousBid = auction.currentBid;

        // Update auction state
        auction.currentBid = msg.value;
        auction.highestBidder = msg.sender;

        // Extend auction if bid is placed in the last EXTENSION_THRESHOLD
        if (auction.endTime - block.timestamp < EXTENSION_THRESHOLD) {
            auction.endTime = block.timestamp + EXTENSION_DURATION;
            emit AuctionExtended(date, auction.endTime);
        }

        emit BidPlaced(date, msg.sender, msg.value);

        // Refund previous bidder after state changes (checks-effects-interactions)
        if (previousBidder != address(0) && previousBid > 0) {
            (bool success, ) = payable(previousBidder).call{value: previousBid}("");
            require(success, "DaisyGenesis: refund failed");
        }
    }

    /**
     * @notice Settle an auction after it has ended
     * @param date The date identifier of the auction
     */
    function settleAuction(uint256 date) external nonReentrant whenNotPaused {
        Auction storage auction = auctions[date];

        require(auction.endTime > 0, "DaisyGenesis: auction does not exist");
        require(block.timestamp >= auction.endTime, "DaisyGenesis: auction not ended");
        require(!auction.settled, "DaisyGenesis: auction already settled");

        auction.settled = true;

        uint256 tokenId = _tokenIdCounter++;
        dateToTokenId[date] = tokenId;

        address winner;
        uint256 amount;

        if (auction.highestBidder != address(0)) {
            // Auction had bids - mint to winner
            winner = auction.highestBidder;
            amount = auction.currentBid;
            _safeMint(winner, tokenId);

            // Transfer funds to treasury
            (bool success, ) = payable(treasury).call{value: amount}("");
            require(success, "DaisyGenesis: treasury transfer failed");
        } else {
            // No bids - mint to treasury
            winner = treasury;
            amount = 0;
            _safeMint(treasury, tokenId);
        }

        emit AuctionSettled(date, tokenId, winner, amount);
    }

    // --- View Functions ---

    /**
     * @notice Get the minimum bid for an auction
     * @param auction The auction to check
     * @return The minimum bid amount
     */
    function _getMinBid(Auction storage auction) internal view returns (uint256) {
        if (auction.currentBid == 0) {
            return auction.startPrice;
        }
        // Current bid + 10% increment
        return auction.currentBid + (auction.currentBid * MIN_BID_INCREMENT_BPS / 10000);
    }

    /**
     * @notice Get all auction information for a specific date
     * @param date The date identifier
     * @return startPrice The starting price
     * @return currentBid The current highest bid
     * @return highestBidder The address of the highest bidder
     * @return endTime The auction end timestamp
     * @return settled Whether the auction has been settled
     * @return metadataURI The metadata URI
     * @return minBid The minimum bid required
     * @return isActive Whether the auction is currently active
     */
    function getAuctionInfo(uint256 date) external view returns (
        uint256 startPrice,
        uint256 currentBid,
        address highestBidder,
        uint256 endTime,
        bool settled,
        string memory metadataURI,
        uint256 minBid,
        bool isActive
    ) {
        Auction storage auction = auctions[date];

        startPrice = auction.startPrice;
        currentBid = auction.currentBid;
        highestBidder = auction.highestBidder;
        endTime = auction.endTime;
        settled = auction.settled;
        metadataURI = auction.metadataURI;

        if (auction.endTime > 0 && !auction.settled) {
            minBid = _getMinBid(auction);
            isActive = block.timestamp < auction.endTime;
        } else {
            minBid = 0;
            isActive = false;
        }
    }

    /**
     * @notice Get DaisyData for a specific token
     * @param tokenId The token ID
     * @return data The DaisyData struct
     */
    function getDaisyData(uint256 tokenId) external view returns (DaisyData memory data) {
        require(_ownerOf(tokenId) != address(0), "DaisyGenesis: token does not exist");
        return daisies[tokenId];
    }

    // --- ERC721 Overrides ---

    /**
     * @notice Returns the token URI for a given token
     * @param tokenId The token ID
     * @return The metadata URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "DaisyGenesis: token does not exist");
        return daisies[tokenId].metadataURI;
    }

    // --- ERC721Enumerable Overrides ---

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }

    // --- EIP-2981 Royalty ---

    /**
     * @notice Returns royalty information for a given token and sale price
     * @param tokenId The token ID (unused, same royalty for all tokens)
     * @param salePrice The sale price
     * @return receiver The royalty receiver address
     * @return royaltyAmount The royalty amount
     */
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        // Silence unused variable warning
        tokenId;
        return (royaltyReceiver, (salePrice * royaltyBps) / 10000);
    }

    // --- Admin Functions ---

    /**
     * @notice Set a new operator address
     * @param _operator The new operator address
     */
    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "DaisyGenesis: invalid operator");
        emit OperatorUpdated(operator, _operator);
        operator = _operator;
    }

    /**
     * @notice Set a new treasury address
     * @param _treasury The new treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "DaisyGenesis: invalid treasury");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    /**
     * @notice Set royalty parameters
     * @param _receiver The royalty receiver address
     * @param _bps The royalty basis points (500 = 5%)
     */
    function setRoyalty(address _receiver, uint256 _bps) external onlyOwner {
        require(_receiver != address(0), "DaisyGenesis: invalid receiver");
        require(_bps <= 1000, "DaisyGenesis: royalty too high"); // Max 10%
        royaltyReceiver = _receiver;
        royaltyBps = _bps;
        emit RoyaltyUpdated(_receiver, _bps);
    }

    /**
     * @notice Pause or unpause the contract
     * @param _paused The new paused state
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    /**
     * @notice Emergency function to rescue stuck ETH
     * @dev Only callable by owner, should only be used in emergencies
     */
    function rescueETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "DaisyGenesis: no ETH to rescue");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "DaisyGenesis: rescue failed");
    }
}
