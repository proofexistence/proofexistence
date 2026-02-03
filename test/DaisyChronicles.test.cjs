const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

// Helper function to expect a revert with specific message
async function expectRevert(promise, expectedMessage) {
  try {
    await promise;
    expect.fail('Transaction should have reverted');
  } catch (error) {
    if (
      !error.message.includes('revert') &&
      !error.message.includes(expectedMessage)
    ) {
      throw new Error(
        `Expected revert with "${expectedMessage}", got: ${error.message}`
      );
    }
    // Check if the error message contains the expected message
    expect(error.message).to.include(expectedMessage);
  }
}

describe('DaisyChroniclesGenesis', function () {
  let genesis;
  let owner, operator, treasury, user1, user2, user3;
  const DATE_20260101 = 20260101;
  const DATE_20260102 = 20260102;
  let START_PRICE;
  const ROYALTY_BPS = 500; // 5%

  beforeEach(async function () {
    START_PRICE = ethers.parseEther('1'); // 1 POL (ethers v6 API)

    [owner, operator, treasury, user1, user2, user3] =
      await ethers.getSigners();

    const Genesis = await ethers.getContractFactory('DaisyChroniclesGenesis');
    genesis = await Genesis.deploy(
      operator.address,
      treasury.address,
      treasury.address, // royalty receiver
      ROYALTY_BPS,
      owner.address
    );
    await genesis.waitForDeployment();
  });

  describe('Auction Creation', function () {
    it('should create auction correctly', async function () {
      await genesis
        .connect(operator)
        .createAuction(DATE_20260101, START_PRICE, 'ipfs://metadata1', 100, 50);

      const auctionInfo = await genesis.getAuctionInfo(DATE_20260101);
      expect(auctionInfo.startPrice).to.equal(START_PRICE);
      expect(auctionInfo.settled).to.equal(false);
      expect(auctionInfo.isActive).to.equal(true);
      expect(auctionInfo.currentBid).to.equal(0n);
      expect(auctionInfo.highestBidder).to.equal(ethers.ZeroAddress);

      // End time should be ~24 hours from now
      const block = await ethers.provider.getBlock('latest');
      const currentTime = block.timestamp;
      const endTimeBigInt = auctionInfo.endTime;
      // Allow 60 second tolerance
      expect(Number(endTimeBigInt)).to.be.closeTo(
        currentTime + 24 * 60 * 60,
        60
      );
    });

    it('should reject auction creation from non-operator', async function () {
      await expectRevert(
        genesis
          .connect(user1)
          .createAuction(
            DATE_20260101,
            START_PRICE,
            'ipfs://metadata1',
            100,
            50
          ),
        'DaisyGenesis: caller is not operator'
      );
    });

    it('should reject duplicate auction for same date', async function () {
      await genesis
        .connect(operator)
        .createAuction(DATE_20260101, START_PRICE, 'ipfs://metadata1', 100, 50);

      await expectRevert(
        genesis
          .connect(operator)
          .createAuction(
            DATE_20260101,
            START_PRICE,
            'ipfs://metadata2',
            100,
            50
          ),
        'DaisyGenesis: auction already exists'
      );
    });

    it('should reject auction with empty metadata URI', async function () {
      await expectRevert(
        genesis
          .connect(operator)
          .createAuction(DATE_20260101, START_PRICE, '', 100, 50),
        'DaisyGenesis: empty metadata URI'
      );
    });
  });

  describe('Bidding', function () {
    beforeEach(async function () {
      await genesis
        .connect(operator)
        .createAuction(DATE_20260101, START_PRICE, 'ipfs://metadata1', 100, 50);
    });

    it('should accept valid bids', async function () {
      await genesis.connect(user1).bid(DATE_20260101, { value: START_PRICE });

      const auctionInfo = await genesis.getAuctionInfo(DATE_20260101);
      expect(auctionInfo.currentBid).to.equal(START_PRICE);
      expect(auctionInfo.highestBidder).to.equal(user1.address);
    });

    it('should require 10% increment on subsequent bids', async function () {
      // First bid
      await genesis.connect(user1).bid(DATE_20260101, { value: START_PRICE });

      // Try low bid (less than 10% increment) - should fail
      const lowBid = START_PRICE + START_PRICE / 20n; // 5% increment
      await expectRevert(
        genesis.connect(user2).bid(DATE_20260101, { value: lowBid }),
        'DaisyGenesis: bid too low'
      );

      // Valid bid with 10% increment - should succeed
      const minValidBid = START_PRICE + START_PRICE / 10n; // 10% increment
      await genesis.connect(user2).bid(DATE_20260101, { value: minValidBid });

      const auctionInfo = await genesis.getAuctionInfo(DATE_20260101);
      expect(auctionInfo.currentBid).to.equal(minValidBid);
      expect(auctionInfo.highestBidder).to.equal(user2.address);
    });

    it('should refund previous bidder', async function () {
      // User1 places initial bid
      await genesis.connect(user1).bid(DATE_20260101, { value: START_PRICE });
      const user1BalanceAfterBid = await ethers.provider.getBalance(
        user1.address
      );

      // User2 places higher bid
      const higherBid = START_PRICE + START_PRICE / 10n;
      await genesis.connect(user2).bid(DATE_20260101, { value: higherBid });

      // User1 should have been refunded
      const user1BalanceAfterRefund = await ethers.provider.getBalance(
        user1.address
      );
      expect(user1BalanceAfterRefund).to.equal(
        user1BalanceAfterBid + START_PRICE
      );
    });

    it('should extend auction if bid in last 10 minutes', async function () {
      // Get initial end time
      const initialInfo = await genesis.getAuctionInfo(DATE_20260101);
      const initialEndTime = Number(initialInfo.endTime);

      // Get current block time
      const block = await ethers.provider.getBlock('latest');
      const currentTime = block.timestamp;

      // Fast forward to 5 minutes before auction end
      const timeToMove = initialEndTime - currentTime - 5 * 60;
      await ethers.provider.send('evm_increaseTime', [timeToMove]);
      await ethers.provider.send('evm_mine', []);

      // Place bid in last 10 minutes
      await genesis.connect(user1).bid(DATE_20260101, { value: START_PRICE });

      // Check that auction was extended by 10 minutes from bid time
      const newInfo = await genesis.getAuctionInfo(DATE_20260101);
      const latestBlock = await ethers.provider.getBlock('latest');
      const blockTime = latestBlock.timestamp;
      expect(Number(newInfo.endTime)).to.be.closeTo(blockTime + 10 * 60, 5); // 10 min extension
    });

    it('should reject bids on non-existent auction', async function () {
      await expectRevert(
        genesis.connect(user1).bid(DATE_20260102, { value: START_PRICE }),
        'DaisyGenesis: auction does not exist'
      );
    });

    it('should reject bids below start price', async function () {
      const lowBid = START_PRICE - 1n;
      await expectRevert(
        genesis.connect(user1).bid(DATE_20260101, { value: lowBid }),
        'DaisyGenesis: bid too low'
      );
    });
  });

  describe('Auction Settlement', function () {
    beforeEach(async function () {
      await genesis
        .connect(operator)
        .createAuction(DATE_20260101, START_PRICE, 'ipfs://metadata1', 100, 50);
    });

    it('should settle auction and mint to winner', async function () {
      // Place bid
      await genesis.connect(user1).bid(DATE_20260101, { value: START_PRICE });

      // Fast forward past auction end
      await ethers.provider.send('evm_increaseTime', [25 * 60 * 60]); // 25 hours
      await ethers.provider.send('evm_mine', []);

      // Record treasury balance before settlement
      const treasuryBalanceBefore = await ethers.provider.getBalance(
        treasury.address
      );

      // Settle auction
      await genesis.settleAuction(DATE_20260101);

      // Check token ownership
      const tokenId = await genesis.dateToTokenId(DATE_20260101);
      expect(await genesis.ownerOf(tokenId)).to.equal(user1.address);

      // Check treasury received funds
      const treasuryBalanceAfter = await ethers.provider.getBalance(
        treasury.address
      );
      expect(treasuryBalanceAfter).to.equal(
        treasuryBalanceBefore + START_PRICE
      );

      // Check auction marked as settled
      const auctionInfo = await genesis.getAuctionInfo(DATE_20260101);
      expect(auctionInfo.settled).to.equal(true);
    });

    it('should mint to treasury if no bids', async function () {
      // Fast forward past auction end without any bids
      await ethers.provider.send('evm_increaseTime', [25 * 60 * 60]);
      await ethers.provider.send('evm_mine', []);

      // Settle auction
      await genesis.settleAuction(DATE_20260101);

      // Token should be minted to treasury
      const tokenId = await genesis.dateToTokenId(DATE_20260101);
      expect(await genesis.ownerOf(tokenId)).to.equal(treasury.address);
    });

    it('should reject settlement before auction ends', async function () {
      await expectRevert(
        genesis.settleAuction(DATE_20260101),
        'DaisyGenesis: auction not ended'
      );
    });

    it('should reject double settlement', async function () {
      await ethers.provider.send('evm_increaseTime', [25 * 60 * 60]);
      await ethers.provider.send('evm_mine', []);

      await genesis.settleAuction(DATE_20260101);

      await expectRevert(
        genesis.settleAuction(DATE_20260101),
        'DaisyGenesis: auction already settled'
      );
    });
  });

  describe('Token Metadata', function () {
    it('should return correct tokenURI', async function () {
      const metadataURI = 'ipfs://QmTestHash123';
      await genesis
        .connect(operator)
        .createAuction(DATE_20260101, START_PRICE, metadataURI, 100, 50);

      await genesis.connect(user1).bid(DATE_20260101, { value: START_PRICE });

      await ethers.provider.send('evm_increaseTime', [25 * 60 * 60]);
      await ethers.provider.send('evm_mine', []);

      await genesis.settleAuction(DATE_20260101);

      const tokenId = await genesis.dateToTokenId(DATE_20260101);
      expect(await genesis.tokenURI(tokenId)).to.equal(metadataURI);
    });

    it('should return correct DaisyData', async function () {
      await genesis
        .connect(operator)
        .createAuction(DATE_20260101, START_PRICE, 'ipfs://meta', 150, 75);

      await genesis.connect(user1).bid(DATE_20260101, { value: START_PRICE });

      await ethers.provider.send('evm_increaseTime', [25 * 60 * 60]);
      await ethers.provider.send('evm_mine', []);

      await genesis.settleAuction(DATE_20260101);

      const tokenId = await genesis.dateToTokenId(DATE_20260101);
      const daisyData = await genesis.getDaisyData(tokenId);

      expect(daisyData.date).to.equal(BigInt(DATE_20260101));
      expect(daisyData.participantCount).to.equal(150n);
      expect(daisyData.sessionCount).to.equal(75n);
    });
  });

  describe('Royalty (EIP-2981)', function () {
    it('should return correct royalty info', async function () {
      const salePrice = ethers.parseEther('100');
      const [receiver, amount] = await genesis.royaltyInfo(0, salePrice);

      expect(receiver).to.equal(treasury.address);
      expect(amount).to.equal((salePrice * BigInt(ROYALTY_BPS)) / 10000n); // 5%
    });
  });

  describe('Admin Functions', function () {
    it('should allow owner to update operator', async function () {
      await genesis.setOperator(user1.address);
      expect(await genesis.operator()).to.equal(user1.address);
    });

    it('should allow owner to update treasury', async function () {
      await genesis.setTreasury(user1.address);
      expect(await genesis.treasury()).to.equal(user1.address);
    });

    it('should allow owner to pause and unpause', async function () {
      await genesis.setPaused(true);
      expect(await genesis.paused()).to.equal(true);

      // Should reject auction creation when paused
      await expectRevert(
        genesis
          .connect(operator)
          .createAuction(DATE_20260101, START_PRICE, 'ipfs://meta', 100, 50),
        'DaisyGenesis: contract is paused'
      );

      await genesis.setPaused(false);
      expect(await genesis.paused()).to.equal(false);
    });
  });
});

describe('DaisyChroniclesStandard', function () {
  let standard;
  let owner, operator, treasury, user1, user2, user3;
  let merkleTree, merkleRoot;
  const DATE_20260101 = 20260101;
  const DATE_20260102 = 20260102;
  const ROYALTY_BPS = 500; // 5%
  let Q1_BASE_PRICE;

  beforeEach(async function () {
    Q1_BASE_PRICE = ethers.parseEther('25'); // 25 POL (ethers v6 API)

    [owner, operator, treasury, user1, user2, user3] =
      await ethers.getSigners();

    const Standard = await ethers.getContractFactory('DaisyChroniclesStandard');
    standard = await Standard.deploy(
      operator.address,
      treasury.address,
      treasury.address, // royalty receiver
      ROYALTY_BPS,
      owner.address
    );
    await standard.waitForDeployment();

    // Create Merkle tree for participants (user1 and user2)
    const leaves = [user1.address, user2.address].map((addr) =>
      keccak256(ethers.solidityPacked(['address'], [addr]))
    );
    merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    merkleRoot = merkleTree.getHexRoot();
  });

  describe('Daily Config', function () {
    it('should set daily config correctly', async function () {
      await standard.connect(operator).setDailyConfig(
        DATE_20260101,
        'ipfs://metadata1',
        merkleRoot,
        100,
        1, // Q1
        10000, // 1x multiplier
        0,
        0
      );

      const dailyInfo = await standard.getDailyInfo(DATE_20260101);
      expect(dailyInfo.participantCount).to.equal(100n);
      expect(dailyInfo.active).to.equal(true);
      expect(dailyInfo.quarter).to.equal(1n);
    });

    it('should reject config from non-operator', async function () {
      await expectRevert(
        standard
          .connect(user1)
          .setDailyConfig(
            DATE_20260101,
            'ipfs://metadata1',
            merkleRoot,
            100,
            1,
            10000,
            0,
            0
          ),
        'DaisyStandard: caller is not operator'
      );
    });

    it('should reject invalid quarter', async function () {
      await expectRevert(
        standard.connect(operator).setDailyConfig(
          DATE_20260101,
          'ipfs://metadata1',
          merkleRoot,
          100,
          5, // Invalid quarter
          10000,
          0,
          0
        ),
        'DaisyStandard: invalid quarter'
      );
    });
  });

  describe('Price Calculation', function () {
    it('should calculate price correctly - Q1 base 25 POL with 100 participants = 1.2x', async function () {
      // 100 participants = 1.2x multiplier (50-200 range)
      await standard.connect(operator).setDailyConfig(
        DATE_20260101,
        'ipfs://metadata1',
        merkleRoot,
        100, // 100 participants = 1.2x
        1, // Q1 = 25 POL base
        10000, // 1x date multiplier
        0,
        0
      );

      const price = await standard.getPrice(DATE_20260101);
      // 25 * 1.0 (time) * 1.2 (participants) * 1.0 (date) = 30 POL
      expect(price).to.equal(ethers.parseEther('30'));
    });

    it('should apply participant multipliers correctly', async function () {
      // Test with <50 participants (1.0x)
      await standard.connect(operator).setDailyConfig(
        DATE_20260101,
        'ipfs://metadata1',
        merkleRoot,
        25, // <50 = 1.0x
        1, // Q1
        10000,
        0,
        0
      );
      expect(await standard.getPrice(DATE_20260101)).to.equal(Q1_BASE_PRICE);

      // Test with 200-500 participants (1.5x)
      await standard.connect(operator).setDailyConfig(
        DATE_20260102,
        'ipfs://metadata2',
        merkleRoot,
        300, // 200-500 = 1.5x
        1, // Q1
        10000,
        0,
        0
      );
      expect(await standard.getPrice(DATE_20260102)).to.equal(
        (Q1_BASE_PRICE * 150n) / 100n // 1.5x = 37.5 POL
      );
    });

    it('should apply date multiplier correctly', async function () {
      await standard.connect(operator).setDailyConfig(
        DATE_20260101,
        'ipfs://metadata1',
        merkleRoot,
        25, // 1.0x participant
        1, // Q1
        15000, // 1.5x date multiplier (special day)
        0,
        0
      );

      const price = await standard.getPrice(DATE_20260101);
      // 25 * 1.0 * 1.0 * 1.5 = 37.5 POL
      expect(price).to.equal((Q1_BASE_PRICE * 150n) / 100n);
    });
  });

  describe('Paid Minting', function () {
    beforeEach(async function () {
      await standard.connect(operator).setDailyConfig(
        DATE_20260101,
        'ipfs://metadata1',
        merkleRoot,
        25, // 1.0x participant multiplier
        1, // Q1
        10000, // 1.0x date multiplier
        0,
        0
      );
    });

    it('should allow paid minting with correct value', async function () {
      const price = await standard.getPrice(DATE_20260101);
      const treasuryBalanceBefore = await ethers.provider.getBalance(
        treasury.address
      );

      await standard.connect(user1).mint(DATE_20260101, { value: price });

      // Check token balance
      expect(await standard.balanceOf(user1.address, DATE_20260101)).to.equal(
        1n
      );

      // Check treasury received funds
      const treasuryBalanceAfter = await ethers.provider.getBalance(
        treasury.address
      );
      expect(treasuryBalanceAfter).to.equal(treasuryBalanceBefore + price);
    });

    it('should reject insufficient payment', async function () {
      const price = await standard.getPrice(DATE_20260101);
      const insufficientAmount = price - 1n;

      await expectRevert(
        standard
          .connect(user1)
          .mint(DATE_20260101, { value: insufficientAmount }),
        'DaisyStandard: insufficient payment'
      );
    });

    it('should prevent double paid minting', async function () {
      const price = await standard.getPrice(DATE_20260101);

      await standard.connect(user1).mint(DATE_20260101, { value: price });

      await expectRevert(
        standard.connect(user1).mint(DATE_20260101, { value: price }),
        'DaisyStandard: already minted paid'
      );
    });
  });

  describe('Free Minting (Merkle Proof)', function () {
    beforeEach(async function () {
      await standard
        .connect(operator)
        .setDailyConfig(
          DATE_20260101,
          'ipfs://metadata1',
          merkleRoot,
          100,
          1,
          10000,
          0,
          0
        );
    });

    it('should allow free minting with valid proof', async function () {
      // Get proof for user1
      const leaf = keccak256(
        ethers.solidityPacked(['address'], [user1.address])
      );
      const proof = merkleTree.getHexProof(leaf);

      await standard.connect(user1).mintFree(DATE_20260101, proof);

      // Check token balance
      expect(await standard.balanceOf(user1.address, DATE_20260101)).to.equal(
        1n
      );

      // Check claimed status
      expect(
        await standard.hasClaimedFree(DATE_20260101, user1.address)
      ).to.equal(true);
    });

    it('should reject free minting with invalid proof', async function () {
      // user3 is not in the Merkle tree
      const leaf = keccak256(
        ethers.solidityPacked(['address'], [user3.address])
      );
      const fakeProof = merkleTree.getHexProof(leaf);

      await expectRevert(
        standard.connect(user3).mintFree(DATE_20260101, fakeProof),
        'DaisyStandard: invalid proof'
      );
    });

    it('should prevent double claiming free mint', async function () {
      const leaf = keccak256(
        ethers.solidityPacked(['address'], [user1.address])
      );
      const proof = merkleTree.getHexProof(leaf);

      // First claim succeeds
      await standard.connect(user1).mintFree(DATE_20260101, proof);

      // Second claim fails
      await expectRevert(
        standard.connect(user1).mintFree(DATE_20260101, proof),
        'DaisyStandard: already claimed free'
      );
    });

    it('should verify canMintFree correctly', async function () {
      const leaf = keccak256(
        ethers.solidityPacked(['address'], [user1.address])
      );
      const proof = merkleTree.getHexProof(leaf);

      // User1 can mint free
      expect(
        await standard.canMintFree(DATE_20260101, user1.address, proof)
      ).to.equal(true);

      // User3 cannot (not in tree)
      const user3Leaf = keccak256(
        ethers.solidityPacked(['address'], [user3.address])
      );
      const user3Proof = merkleTree.getHexProof(user3Leaf);
      expect(
        await standard.canMintFree(DATE_20260101, user3.address, user3Proof)
      ).to.equal(false);
    });
  });

  describe('User Can Have Both Free and Paid', function () {
    beforeEach(async function () {
      await standard
        .connect(operator)
        .setDailyConfig(
          DATE_20260101,
          'ipfs://metadata1',
          merkleRoot,
          25,
          1,
          10000,
          0,
          0
        );
    });

    it('should allow user to claim both free and paid mint', async function () {
      const price = await standard.getPrice(DATE_20260101);

      // Claim free first
      const leaf = keccak256(
        ethers.solidityPacked(['address'], [user1.address])
      );
      const proof = merkleTree.getHexProof(leaf);
      await standard.connect(user1).mintFree(DATE_20260101, proof);

      // Then paid mint
      await standard.connect(user1).mint(DATE_20260101, { value: price });

      // Should have 2 tokens total
      expect(await standard.balanceOf(user1.address, DATE_20260101)).to.equal(
        2n
      );
    });
  });

  describe('Token URI', function () {
    it('should return correct URI for date', async function () {
      const metadataURI = 'ipfs://QmTestStandard123';
      await standard
        .connect(operator)
        .setDailyConfig(
          DATE_20260101,
          metadataURI,
          merkleRoot,
          100,
          1,
          10000,
          0,
          0
        );

      expect(await standard.uri(DATE_20260101)).to.equal(metadataURI);
    });

    it('should reject URI request for unconfigured date', async function () {
      await expectRevert(
        standard.uri(DATE_20260102),
        'DaisyStandard: URI not set'
      );
    });
  });

  describe('Royalty (EIP-2981)', function () {
    it('should return correct royalty info', async function () {
      const salePrice = ethers.parseEther('100');
      const [receiver, amount] = await standard.royaltyInfo(
        DATE_20260101,
        salePrice
      );

      expect(receiver).to.equal(treasury.address);
      expect(amount).to.equal((salePrice * BigInt(ROYALTY_BPS)) / 10000n); // 5%
    });
  });

  describe('Admin Functions', function () {
    it('should allow owner to update quarter base price', async function () {
      const newPrice = ethers.parseEther('30');
      await standard.setQuarterBasePrice(1, newPrice);
      expect(await standard.quarterBasePrices(1)).to.equal(newPrice);
    });

    it('should allow operator to deactivate daily config', async function () {
      await standard
        .connect(operator)
        .setDailyConfig(
          DATE_20260101,
          'ipfs://metadata1',
          merkleRoot,
          100,
          1,
          10000,
          0,
          0
        );

      await standard.connect(operator).setDailyActive(DATE_20260101, false);

      const dailyInfo = await standard.getDailyInfo(DATE_20260101);
      expect(dailyInfo.active).to.equal(false);
    });

    it('should allow owner to pause and unpause', async function () {
      await standard.pause();
      expect(await standard.paused()).to.equal(true);

      await standard
        .connect(operator)
        .setDailyConfig(
          DATE_20260101,
          'ipfs://metadata1',
          merkleRoot,
          100,
          1,
          10000,
          0,
          0
        );

      // Minting should fail when paused
      const price = await standard.getPrice(DATE_20260101);
      await expectRevert(
        standard.connect(user1).mint(DATE_20260101, { value: price }),
        'DaisyStandard: contract is paused'
      );

      await standard.unpause();
      expect(await standard.paused()).to.equal(false);
    });
  });

  describe('Mint Window (Time Constraints)', function () {
    it('should reject minting before start time', async function () {
      const block = await ethers.provider.getBlock('latest');
      const currentTime = block.timestamp;
      const startTime = currentTime + 3600; // 1 hour from now
      const endTime = currentTime + 7200; // 2 hours from now

      await standard
        .connect(operator)
        .setDailyConfig(
          DATE_20260101,
          'ipfs://metadata1',
          merkleRoot,
          25,
          1,
          10000,
          startTime,
          endTime
        );

      const price = await standard.getPrice(DATE_20260101);
      await expectRevert(
        standard.connect(user1).mint(DATE_20260101, { value: price }),
        'DaisyStandard: mint not started'
      );
    });

    it('should reject minting after end time', async function () {
      const block = await ethers.provider.getBlock('latest');
      const currentTime = block.timestamp;
      const startTime = currentTime - 7200; // 2 hours ago
      const endTime = currentTime - 3600; // 1 hour ago

      await standard
        .connect(operator)
        .setDailyConfig(
          DATE_20260101,
          'ipfs://metadata1',
          merkleRoot,
          25,
          1,
          10000,
          startTime,
          endTime
        );

      const price = await standard.getPrice(DATE_20260101);
      await expectRevert(
        standard.connect(user1).mint(DATE_20260101, { value: price }),
        'DaisyStandard: mint ended'
      );
    });
  });
});
