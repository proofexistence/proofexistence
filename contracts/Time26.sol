// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Time26
 * @notice ERC-20 token with fixed supply of 48,420,000
 * @dev No minting after deployment - supply is fixed and deflationary via burns
 */
contract Time26 is ERC20, ERC20Burnable, Ownable {
    /// @notice Fixed total supply - no additional minting allowed
    uint256 public constant MAX_SUPPLY = 48_420_000 * 10 ** 18;

    constructor(address initialOwner)
        ERC20("Time26", "TIME26")
        Ownable(initialOwner)
    {
        require(initialOwner != address(0), "Time26: invalid owner address");
        // Mint entire fixed supply to deployer
        _mint(msg.sender, MAX_SUPPLY);
    }

    // NOTE: No mint function - supply is fixed at 48,420,000
    // Burns are allowed via ERC20Burnable for deflationary mechanics
}
