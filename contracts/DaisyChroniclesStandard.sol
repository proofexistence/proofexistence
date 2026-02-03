// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title DaisyChroniclesStandard
 * @notice ERC-1155 contract for Standard (unlimited) Daisy NFT editions
 * @dev Each token ID represents a date in YYYYMMDD format
 *      Features dynamic pricing based on time, participants, and date multipliers
 *      Supports Merkle-verified free mints for daily participants
 */
contract DaisyChroniclesStandard is ERC1155, Ownable, IERC2981, ReentrancyGuard {
    // --- Structs ---
    struct DailyConfig {
        string metadataURI;
        bytes32 participantRoot;   // Merkle root for free mints
        uint256 participantCount;
        uint8 quarter;             // 1-4
        uint256 dateMultiplierBps; // 10000 = 1x, 12000 = 1.2x, 20000 = 2x
        uint256 startTime;         // 0 = Phase 1 (no time limit)
        uint256 endTime;           // 0 = Phase 1 (no time limit)
        uint256 mintCount;
        bool active;
    }

    // --- State Variables ---
    address public operator;
    address public treasury;

    mapping(uint256 => DailyConfig) public dailyConfigs; // date => DailyConfig
    mapping(uint256 => mapping(address => bool)) public hasClaimedFree; // date => user => claimed
    mapping(uint256 => mapping(address => bool)) public hasMintedPaid; // date => user => minted

    address public royaltyReceiver;
    uint256 public royaltyBps; // 500 = 5%

    mapping(uint8 => uint256) public quarterBasePrices; // quarter => price in wei

    bool public paused;

    // --- Events ---
    event DailyConfigSet(uint256 indexed date, string metadataURI, uint256 participantCount);
    event StandardMinted(uint256 indexed date, address indexed minter, bool isFree, uint256 price);
    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event RoyaltyUpdated(address indexed receiver, uint256 bps);
    event QuarterBasePriceUpdated(uint8 quarter, uint256 price);
    event DailyActiveUpdated(uint256 indexed date, bool active);
    event Paused(bool isPaused);

    // --- Modifiers ---
    modifier onlyOperator() {
        require(msg.sender == operator, "DaisyStandard: caller is not operator");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "DaisyStandard: contract is paused");
        _;
    }

    // --- Constructor ---
    constructor(
        address _operator,
        address _treasury,
        address _royaltyReceiver,
        uint256 _royaltyBps,
        address _initialOwner
    ) ERC1155("") Ownable(_initialOwner) {
        require(_operator != address(0), "DaisyStandard: invalid operator");
        require(_treasury != address(0), "DaisyStandard: invalid treasury");
        require(_royaltyReceiver != address(0), "DaisyStandard: invalid royalty receiver");
        require(_royaltyBps <= 1000, "DaisyStandard: royalty too high"); // Max 10%

        operator = _operator;
        treasury = _treasury;
        royaltyReceiver = _royaltyReceiver;
        royaltyBps = _royaltyBps;

        // Set quarter base prices (in POL/MATIC)
        quarterBasePrices[1] = 25 ether;  // Q1: 25 POL
        quarterBasePrices[2] = 35 ether;  // Q2: 35 POL
        quarterBasePrices[3] = 50 ether;  // Q3: 50 POL
        quarterBasePrices[4] = 75 ether;  // Q4: 75 POL
    }

    // --- Configuration Functions ---

    /**
     * @notice Set up a new daily Daisy for minting
     * @param date The date identifier (YYYYMMDD format as uint256)
     * @param metadataURI The metadata URI for the NFT
     * @param participantRoot The Merkle root for free mint verification
     * @param participantCount Number of participants in the daily drawing
     * @param quarter The quarter (1-4) for base price lookup
     * @param dateMultiplierBps Date-specific multiplier in basis points (10000 = 1x)
     * @param startTime Mint window start (0 = no limit, Phase 1)
     * @param endTime Mint window end (0 = no limit, Phase 1)
     */
    function setDailyConfig(
        uint256 date,
        string calldata metadataURI,
        bytes32 participantRoot,
        uint256 participantCount,
        uint8 quarter,
        uint256 dateMultiplierBps,
        uint256 startTime,
        uint256 endTime
    ) external onlyOperator {
        require(bytes(metadataURI).length > 0, "DaisyStandard: empty metadata URI");
        require(quarter >= 1 && quarter <= 4, "DaisyStandard: invalid quarter");
        require(dateMultiplierBps >= 10000, "DaisyStandard: multiplier too low");
        require(startTime == 0 || endTime == 0 || endTime > startTime, "DaisyStandard: invalid time range");

        dailyConfigs[date] = DailyConfig({
            metadataURI: metadataURI,
            participantRoot: participantRoot,
            participantCount: participantCount,
            quarter: quarter,
            dateMultiplierBps: dateMultiplierBps,
            startTime: startTime,
            endTime: endTime,
            mintCount: dailyConfigs[date].mintCount, // Preserve existing mint count
            active: true
        });

        emit DailyConfigSet(date, metadataURI, participantCount);
    }

    // --- Pricing Functions ---

    /**
     * @notice Calculate the current price for a date
     * @dev Price = basePrice * timeMultiplier * participantMultiplier * dateMultiplier
     *      All multipliers are in BPS (10000 = 1x)
     * @param date The date identifier
     * @return The current price in wei
     */
    function getPrice(uint256 date) public view returns (uint256) {
        DailyConfig storage config = dailyConfigs[date];
        require(config.active, "DaisyStandard: date not active");

        uint256 basePrice = quarterBasePrices[config.quarter];
        require(basePrice > 0, "DaisyStandard: quarter price not set");

        // Calculate time multiplier (only if time constraints exist)
        uint256 timeMultiplierBps = _getTimeMultiplier(config);

        // Calculate participant multiplier
        uint256 participantMultiplierBps = _getParticipantMultiplier(config.participantCount);

        // Calculate final price with all multipliers
        // price = base * (timeMult / 10000) * (participantMult / 10000) * (dateMult / 10000)
        // To avoid precision loss: price = base * timeMult * participantMult * dateMult / 10000^3
        uint256 price = basePrice
            * timeMultiplierBps
            * participantMultiplierBps
            * config.dateMultiplierBps
            / (10000 * 10000 * 10000);

        return price;
    }

    /**
     * @notice Get time-based multiplier
     * @dev >12h remaining: 1.0x, 6-12h: 1.1x, 1-6h: 1.25x, <1h: 1.5x
     * @param config The daily config
     * @return Multiplier in basis points
     */
    function _getTimeMultiplier(DailyConfig storage config) internal view returns (uint256) {
        // Phase 1: No time constraints
        if (config.startTime == 0 || config.endTime == 0) {
            return 10000; // 1x
        }

        // Check if within mint window
        if (block.timestamp < config.startTime || block.timestamp > config.endTime) {
            return 10000; // 1x (will fail mint check anyway)
        }

        uint256 timeRemaining = config.endTime - block.timestamp;

        if (timeRemaining > 12 hours) {
            return 10000;  // 1.0x
        } else if (timeRemaining > 6 hours) {
            return 11000;  // 1.1x
        } else if (timeRemaining > 1 hours) {
            return 12500;  // 1.25x
        } else {
            return 15000;  // 1.5x
        }
    }

    /**
     * @notice Get participant-based multiplier
     * @dev <50: 1.0x, 50-200: 1.2x, 200-500: 1.5x, >500: 2.0x
     * @param participantCount Number of participants
     * @return Multiplier in basis points
     */
    function _getParticipantMultiplier(uint256 participantCount) internal pure returns (uint256) {
        if (participantCount < 50) {
            return 10000;  // 1.0x
        } else if (participantCount < 200) {
            return 12000;  // 1.2x
        } else if (participantCount < 500) {
            return 15000;  // 1.5x
        } else {
            return 20000;  // 2.0x
        }
    }

    // --- Minting Functions ---

    /**
     * @notice Mint a paid Standard edition
     * @param date The date identifier (YYYYMMDD format)
     */
    function mint(uint256 date) external payable nonReentrant whenNotPaused {
        DailyConfig storage config = dailyConfigs[date];

        require(config.active, "DaisyStandard: date not active");
        require(!hasMintedPaid[date][msg.sender], "DaisyStandard: already minted paid");

        // Check time constraints (Phase 2+)
        if (config.startTime > 0 && config.endTime > 0) {
            require(block.timestamp >= config.startTime, "DaisyStandard: mint not started");
            require(block.timestamp <= config.endTime, "DaisyStandard: mint ended");
        }

        uint256 price = getPrice(date);
        require(msg.value >= price, "DaisyStandard: insufficient payment");

        hasMintedPaid[date][msg.sender] = true;
        config.mintCount++;

        _mint(msg.sender, date, 1, "");

        // Transfer to treasury
        (bool success, ) = payable(treasury).call{value: msg.value}("");
        require(success, "DaisyStandard: treasury transfer failed");

        emit StandardMinted(date, msg.sender, false, msg.value);
    }

    /**
     * @notice Mint a free Standard edition (for participants)
     * @param date The date identifier (YYYYMMDD format)
     * @param merkleProof The Merkle proof for verification
     */
    function mintFree(uint256 date, bytes32[] calldata merkleProof) external nonReentrant whenNotPaused {
        DailyConfig storage config = dailyConfigs[date];

        require(config.active, "DaisyStandard: date not active");
        require(!hasClaimedFree[date][msg.sender], "DaisyStandard: already claimed free");

        // Check time constraints (Phase 2+)
        if (config.startTime > 0 && config.endTime > 0) {
            require(block.timestamp >= config.startTime, "DaisyStandard: mint not started");
            require(block.timestamp <= config.endTime, "DaisyStandard: mint ended");
        }

        // Verify Merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(
            MerkleProof.verify(merkleProof, config.participantRoot, leaf),
            "DaisyStandard: invalid proof"
        );

        hasClaimedFree[date][msg.sender] = true;
        config.mintCount++;

        _mint(msg.sender, date, 1, "");

        emit StandardMinted(date, msg.sender, true, 0);
    }

    // --- View Functions ---

    /**
     * @notice Get the metadata URI for a token
     * @param tokenId The token ID (date in YYYYMMDD format)
     * @return The metadata URI
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        DailyConfig storage config = dailyConfigs[tokenId];
        require(bytes(config.metadataURI).length > 0, "DaisyStandard: URI not set");
        return config.metadataURI;
    }

    /**
     * @notice Get all daily info for a specific date
     * @param date The date identifier
     * @return metadataURI The metadata URI
     * @return participantCount Number of participants
     * @return quarter The quarter (1-4)
     * @return dateMultiplierBps The date multiplier in BPS
     * @return startTime Mint window start
     * @return endTime Mint window end
     * @return mintCount Total mints for this date
     * @return active Whether minting is active
     * @return currentPrice The current price in wei
     */
    function getDailyInfo(uint256 date) external view returns (
        string memory metadataURI,
        uint256 participantCount,
        uint8 quarter,
        uint256 dateMultiplierBps,
        uint256 startTime,
        uint256 endTime,
        uint256 mintCount,
        bool active,
        uint256 currentPrice
    ) {
        DailyConfig storage config = dailyConfigs[date];

        metadataURI = config.metadataURI;
        participantCount = config.participantCount;
        quarter = config.quarter;
        dateMultiplierBps = config.dateMultiplierBps;
        startTime = config.startTime;
        endTime = config.endTime;
        mintCount = config.mintCount;
        active = config.active;

        if (config.active && quarterBasePrices[config.quarter] > 0) {
            currentPrice = getPrice(date);
        } else {
            currentPrice = 0;
        }
    }

    /**
     * @notice Check if an address can mint free for a date
     * @param date The date identifier
     * @param user The user address
     * @param merkleProof The Merkle proof
     * @return Whether the user can mint free
     */
    function canMintFree(uint256 date, address user, bytes32[] calldata merkleProof) external view returns (bool) {
        DailyConfig storage config = dailyConfigs[date];

        if (!config.active) return false;
        if (hasClaimedFree[date][user]) return false;

        // Check time constraints
        if (config.startTime > 0 && config.endTime > 0) {
            if (block.timestamp < config.startTime || block.timestamp > config.endTime) {
                return false;
            }
        }

        // Verify Merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(user));
        return MerkleProof.verify(merkleProof, config.participantRoot, leaf);
    }

    /**
     * @notice Check if an address can mint paid for a date
     * @param date The date identifier
     * @param user The user address
     * @return Whether the user can mint paid
     */
    function canMintPaid(uint256 date, address user) external view returns (bool) {
        DailyConfig storage config = dailyConfigs[date];

        if (!config.active) return false;
        if (hasMintedPaid[date][user]) return false;

        // Check time constraints
        if (config.startTime > 0 && config.endTime > 0) {
            if (block.timestamp < config.startTime || block.timestamp > config.endTime) {
                return false;
            }
        }

        return true;
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

    /**
     * @notice Check if contract supports an interface
     * @param interfaceId The interface identifier
     * @return Whether the interface is supported
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }

    // --- Admin Functions ---

    /**
     * @notice Set a new operator address
     * @param _operator The new operator address
     */
    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "DaisyStandard: invalid operator");
        emit OperatorUpdated(operator, _operator);
        operator = _operator;
    }

    /**
     * @notice Set a new treasury address
     * @param _treasury The new treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "DaisyStandard: invalid treasury");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    /**
     * @notice Set base price for a quarter
     * @param quarter The quarter (1-4)
     * @param price The price in wei
     */
    function setQuarterBasePrice(uint8 quarter, uint256 price) external onlyOwner {
        require(quarter >= 1 && quarter <= 4, "DaisyStandard: invalid quarter");
        quarterBasePrices[quarter] = price;
        emit QuarterBasePriceUpdated(quarter, price);
    }

    /**
     * @notice Set royalty parameters
     * @param _receiver The royalty receiver address
     * @param _bps The royalty basis points (500 = 5%)
     */
    function setRoyalty(address _receiver, uint256 _bps) external onlyOwner {
        require(_receiver != address(0), "DaisyStandard: invalid receiver");
        require(_bps <= 1000, "DaisyStandard: royalty too high"); // Max 10%
        royaltyReceiver = _receiver;
        royaltyBps = _bps;
        emit RoyaltyUpdated(_receiver, _bps);
    }

    /**
     * @notice Set active status for a daily config
     * @param date The date identifier
     * @param _active The new active status
     */
    function setDailyActive(uint256 date, bool _active) external onlyOperator {
        dailyConfigs[date].active = _active;
        emit DailyActiveUpdated(date, _active);
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }

    /**
     * @notice Emergency function to rescue stuck ETH
     * @dev Only callable by owner, should only be used in emergencies
     */
    function rescueETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "DaisyStandard: no ETH to rescue");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "DaisyStandard: rescue failed");
    }
}
