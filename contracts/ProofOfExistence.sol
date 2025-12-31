// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Time26.sol";

contract ProofOfExistence is Ownable {
    using SafeERC20 for IERC20;

    // --- Structs ---
    struct Existence {
        address owner;
        uint256 duration;
        uint256 timestamp;
        string metadataURI;
        string displayName; // ADDED: Human readable identity
        string message;
    }

    // --- State Variables ---
    mapping(uint256 => Existence) public existences;
    uint256 public nextExistenceId;

    // Configuration
    Time26 public time26Token;
    address public treasury;
    
    // Pricing
    uint256 public baseFeeNative; // e.g., 0.001 ETH
    uint256 public pricePerSecondNative; 
    uint256 public baseFeeTime26;
    uint256 public pricePerSecondTime26;
    uint256 public freeAllowance = 45; // 45 seconds free of *extra time fee*

    // Deflation & Logic
    bool public deflationMode = true; // Default: Burn Time26

    // Events
    event ExistenceMinted(uint256 indexed id, address indexed owner, uint256 duration, string metadataURI, string displayName, string message);
    event BatchProofEmitted(bytes32 indexed merkleRoot, string ipfsCid);
    event PricingUpdated(uint256 baseNative, uint256 rateNative, uint256 baseTime26, uint256 rateTime26);

    constructor(address _time26, address _treasury, address _initialOwner) Ownable(_initialOwner) {
        time26Token = Time26(_time26);
        treasury = _treasury;
    }

    // --- Track A: Batch Proof (Web2/Gasless) ---
    function emitBatchProof(bytes32 merkleRoot, string memory ipfsCid) external onlyOwner {
        emit BatchProofEmitted(merkleRoot, ipfsCid);
    }

    // --- Track B: Eternal Proof (Web3/Paid) ---
    // 1. Pay with Native (ETH/MATIC)
    function mintEternalNative(uint256 duration, string memory metadataURI, string memory displayName, string memory message) external payable {
        uint256 cost = calculateCostNative(duration);
        require(msg.value >= cost, "Insufficient payment");

        // Refund excess
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }

        // Send revenue to treasury (Native always goes to Treasury)
        if (cost > 0) {
            payable(treasury).transfer(cost);
        }

        _mint(msg.sender, duration, metadataURI, displayName, message);
    }

    // 2. Pay with Time26 (Deflationary)
    function mintEternalTime26(uint256 duration, string memory metadataURI, string memory displayName, string memory message) external {
        uint256 cost = calculateCostTime26(duration);
        
        // Transfer Check
        require(time26Token.balanceOf(msg.sender) >= cost, "Insufficient Time26 balance");

        if (cost > 0) {
            if (deflationMode) {
                // BURN IT
                time26Token.burnFrom(msg.sender, cost);
            } else {
                // TREASURY IT
                time26Token.transferFrom(msg.sender, treasury, cost);
            }
        }

        _mint(msg.sender, duration, metadataURI, displayName, message);
    }

    // --- Internal ---
    function _mint(address to, uint256 duration, string memory metadataURI, string memory displayName, string memory message) internal {
        uint256 id = nextExistenceId++;
        existences[id] = Existence({
            owner: to,
            duration: duration,
            timestamp: block.timestamp,
            metadataURI: metadataURI,
            displayName: displayName,
            message: message
        });

        emit ExistenceMinted(id, to, duration, metadataURI, displayName, message);
    }

    // --- Views ---
    function calculateCostNative(uint256 duration) public view returns (uint256) {
        uint256 extraTime = duration > freeAllowance ? duration - freeAllowance : 0;
        return baseFeeNative + (extraTime * pricePerSecondNative);
    }

    function calculateCostTime26(uint256 duration) public view returns (uint256) {
        uint256 extraTime = duration > freeAllowance ? duration - freeAllowance : 0;
        return baseFeeTime26 + (extraTime * pricePerSecondTime26);
    }

    // --- Admin ---
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
        treasury = _treasury;
    }
}
