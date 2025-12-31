// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Time26.sol";

/**
 * @title ProofRecorder
 * @notice Core contract for Proof of Existence - records proofs and coordinates NFT minting
 * @dev Handles both Standard Proof (batch Merkle) and Instant Proof (immediate NFT mint)
 */

// Interface for TrailNFT minting
interface ITrailNFT {
    function mint(address to, string calldata arweaveHash, uint256 duration) external returns (uint256);
}

contract ProofRecorder is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Constants ---
    uint256 public constant MIN_DURATION = 10; // Minimum 10 seconds

    // --- State Variables ---

    // Linked contracts
    Time26 public time26Token;
    ITrailNFT public trailNFT;
    address public treasury;

    // Operator (hot wallet for daily operations)
    address public operator;

    // Pricing (Native token - POL)
    uint256 public baseFeeNative;
    uint256 public pricePerSecondNative;

    // Pricing (Time26 token)
    uint256 public baseFeeTime26;
    uint256 public pricePerSecondTime26;

    // Free allowance (seconds)
    uint256 public freeAllowance = 45;

    // Deflation mode: true = burn Time26, false = send to treasury
    bool public deflationMode = true;

    // Pause state
    bool public paused;

    // Daily Merkle roots: day number => root
    mapping(uint256 => bytes32) public dailyMerkleRoots;

    // Track claimed rewards: user => day => amount
    mapping(address => mapping(uint256 => uint256)) public claimedAmounts;

    // Existence counter (for legacy compatibility)
    uint256 public nextExistenceId;

    // Legacy existence records (for backward compatibility)
    struct Existence {
        address owner;
        uint256 duration;
        uint256 timestamp;
        string metadataURI;
        string displayName;
        string message;
        uint256 nftTokenId; // NEW: Link to NFT token ID
    }
    mapping(uint256 => Existence) public existences;

    // --- Events ---

    event ExistenceMinted(
        uint256 indexed id,
        address indexed owner,
        uint256 duration,
        string metadataURI,
        string displayName,
        string message,
        uint256 nftTokenId
    );
    event BatchProofEmitted(bytes32 indexed merkleRoot, string arweaveCid);
    event MerkleRootStored(uint256 indexed day, bytes32 root);
    event RewardsClaimed(address indexed user, uint256 indexed day, uint256 amount);
    event PricingUpdated(uint256 baseNative, uint256 rateNative, uint256 baseTime26, uint256 rateTime26);
    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);
    event Paused(address account);
    event Unpaused(address account);

    // --- Modifiers ---

    modifier onlyOperator() {
        require(msg.sender == operator, "ProofRecorder: caller is not operator");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "ProofRecorder: paused");
        _;
    }

    // --- Constructor ---

    constructor(
        address _time26,
        address _treasury,
        address _operator,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_time26 != address(0), "ProofRecorder: invalid time26 address");
        require(_treasury != address(0), "ProofRecorder: invalid treasury address");
        require(_operator != address(0), "ProofRecorder: invalid operator address");
        time26Token = Time26(_time26);
        treasury = _treasury;
        operator = _operator;
    }

    // --- Track A: Standard Proof (Batch/Gasless) ---

    /**
     * @notice Store daily Merkle root (called by operator)
     * @param day Day number (e.g., days since epoch)
     * @param root Merkle root hash
     */
    function storeMerkleRoot(uint256 day, bytes32 root) external onlyOperator whenNotPaused {
        require(dailyMerkleRoots[day] == bytes32(0), "ProofRecorder: root already set");
        dailyMerkleRoots[day] = root;
        emit MerkleRootStored(day, root);
    }

    /**
     * @notice Emit batch proof event (legacy compatibility)
     * @param merkleRoot Merkle root of the batch
     * @param arweaveCid Arweave CID where batch data is stored
     */
    function emitBatchProof(bytes32 merkleRoot, string memory arweaveCid) external onlyOperator whenNotPaused {
        emit BatchProofEmitted(merkleRoot, arweaveCid);
    }

    // --- Track B: Instant Proof (Paid) ---

    /**
     * @notice Mint instant proof with Native token (POL) payment
     * @param duration Duration in seconds
     * @param metadataURI Arweave URI for metadata
     * @param displayName User's display name
     * @param message User's message
     */
    function mintInstantNative(
        uint256 duration,
        string memory metadataURI,
        string memory displayName,
        string memory message
    ) external payable whenNotPaused {
        require(duration >= MIN_DURATION, "ProofRecorder: duration too short");

        uint256 cost = calculateCostNative(duration);
        require(msg.value >= cost, "ProofRecorder: insufficient payment");

        // Calculate refund before any state changes
        uint256 refund = msg.value - cost;

        // EFFECTS: Update state first (CEI pattern)
        _mintExistence(msg.sender, duration, metadataURI, displayName, message);

        // INTERACTIONS: External calls last
        if (cost > 0) {
            payable(treasury).transfer(cost);
        }
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
    }

    /**
     * @notice Mint instant proof with Time26 token payment
     * @param duration Duration in seconds
     * @param metadataURI Arweave URI for metadata
     * @param displayName User's display name
     * @param message User's message
     */
    function mintInstantTime26(
        uint256 duration,
        string memory metadataURI,
        string memory displayName,
        string memory message
    ) external whenNotPaused nonReentrant {
        require(duration >= MIN_DURATION, "ProofRecorder: duration too short");

        uint256 cost = calculateCostTime26(duration);
        require(time26Token.balanceOf(msg.sender) >= cost, "ProofRecorder: insufficient Time26 balance");

        if (cost > 0) {
            if (deflationMode) {
                // Burn Time26
                time26Token.burnFrom(msg.sender, cost);
            } else {
                // Send to treasury
                time26Token.transferFrom(msg.sender, treasury, cost);
            }
        }

        _mintExistence(msg.sender, duration, metadataURI, displayName, message);
    }

    /**
     * @notice Internal mint function - records existence and mints NFT
     */
    function _mintExistence(
        address to,
        uint256 duration,
        string memory metadataURI,
        string memory displayName,
        string memory message
    ) internal {
        uint256 existenceId = nextExistenceId++;
        uint256 nftTokenId = 0;

        // Mint NFT if TrailNFT is configured
        if (address(trailNFT) != address(0)) {
            nftTokenId = trailNFT.mint(to, metadataURI, duration);
        }

        // Store existence record
        existences[existenceId] = Existence({
            owner: to,
            duration: duration,
            timestamp: block.timestamp,
            metadataURI: metadataURI,
            displayName: displayName,
            message: message,
            nftTokenId: nftTokenId
        });

        emit ExistenceMinted(existenceId, to, duration, metadataURI, displayName, message, nftTokenId);
    }

    // --- Pricing Views ---

    function calculateCostNative(uint256 duration) public view returns (uint256) {
        uint256 extraTime = duration > freeAllowance ? duration - freeAllowance : 0;
        return baseFeeNative + (extraTime * pricePerSecondNative);
    }

    function calculateCostTime26(uint256 duration) public view returns (uint256) {
        uint256 extraTime = duration > freeAllowance ? duration - freeAllowance : 0;
        return baseFeeTime26 + (extraTime * pricePerSecondTime26);
    }

    // --- Admin Functions ---

    function setTrailNFT(address _trailNFT) external onlyOwner {
        require(_trailNFT != address(0), "ProofRecorder: invalid address");
        trailNFT = ITrailNFT(_trailNFT);
    }

    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "ProofRecorder: invalid operator address");
        emit OperatorUpdated(operator, _operator);
        operator = _operator;
    }

    function setPricing(
        uint256 _baseNative,
        uint256 _rateNative,
        uint256 _baseTime26,
        uint256 _rateTime26,
        uint256 _allowance
    ) external onlyOwner {
        baseFeeNative = _baseNative;
        pricePerSecondNative = _rateNative;
        baseFeeTime26 = _baseTime26;
        pricePerSecondTime26 = _rateTime26;
        freeAllowance = _allowance;
        emit PricingUpdated(_baseNative, _rateNative, _baseTime26, _rateTime26);
    }

    function setDeflationMode(bool _mode) external onlyOwner {
        deflationMode = _mode;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "ProofRecorder: invalid treasury address");
        treasury = _treasury;
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    // --- Legacy Compatibility ---

    // These functions maintain backward compatibility with old contract interface

    /**
     * @notice Legacy function name - calls mintInstantNative
     */
    function mintEternalNative(
        uint256 duration,
        string memory metadataURI,
        string memory displayName,
        string memory message
    ) external payable whenNotPaused nonReentrant {
        require(duration >= MIN_DURATION, "ProofRecorder: duration too short");

        uint256 cost = calculateCostNative(duration);
        require(msg.value >= cost, "ProofRecorder: insufficient payment");

        // 1. Effects (Minting)
        _mintExistence(msg.sender, duration, metadataURI, displayName, message);

        // 2. Interactions (Transfers)
        if (cost > 0) {
            payable(treasury).transfer(cost);
        }

        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }

    /**
     * @notice Legacy function name - calls mintInstantTime26
     */
    function mintEternalTime26(
        uint256 duration,
        string memory metadataURI,
        string memory displayName,
        string memory message
    ) external whenNotPaused nonReentrant {
        require(duration >= MIN_DURATION, "ProofRecorder: duration too short");

        uint256 cost = calculateCostTime26(duration);
        require(time26Token.balanceOf(msg.sender) >= cost, "ProofRecorder: insufficient Time26 balance");

        if (cost > 0) {
            if (deflationMode) {
                time26Token.burnFrom(msg.sender, cost);
            } else {
                time26Token.transferFrom(msg.sender, treasury, cost);
            }
        }

        _mintExistence(msg.sender, duration, metadataURI, displayName, message);
    }
}
