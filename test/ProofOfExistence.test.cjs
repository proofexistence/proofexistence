const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('ProofOfExistence', function () {
  it('Should deploy and support Dual-Track', async function () {
    const [owner, otherAccount, treasury] = await ethers.getSigners();

    // 1. Deploy Time26
    const Time26 = await ethers.getContractFactory('Time26');
    const time26 = await Time26.deploy(owner.address);
    await time26.deployed();
    console.log('Time26 deployed to:', time26.address);

    // 2. Deploy ProofOfExistence
    const ProofOfExistence =
      await ethers.getContractFactory('ProofOfExistence');
    const proof = await ProofOfExistence.deploy(
      time26.address,
      treasury.address,
      owner.address
    );
    await proof.deployed();
    console.log('ProofOfExistence deployed to:', proof.address);

    // 3. Setup Pricing
    // Native: Base 0, Rate 0 (for testing)
    // Time26: Base 10 tokens, Rate 1 token/sec
    // Allowance: 45 seconds
    await proof.setPricing(
      0,
      0,
      ethers.utils.parseEther('10'), // Base Fee Time26
      ethers.utils.parseEther('1'), // Rate Time26
      45
    );

    // 4. Test Track A (Batch)
    const fakeRoot = ethers.utils.formatBytes32String('root');
    await proof.emitBatchProof(fakeRoot, 'QmHash');
    console.log('Track A (Batch) executed successfully');

    // 5. Test Track B (Time26)
    // Mint Time26 to Other Account first
    await time26.mint(otherAccount.address, ethers.utils.parseEther('100'));

    // Approve
    await time26
      .connect(otherAccount)
      .approve(proof.address, ethers.utils.parseEther('100'));

    // Mint Eternal (55 seconds -> 10 + (55-45)*1 = 20 tokens cost)
    await proof
      .connect(otherAccount)
      .mintEternalTime26(55, 'ipfs://metadata', 'Test Message');

    console.log('Track B (Time26) executed successfully');

    // Check Balance (Should have burned 20 tokens from 100 -> 80)
    const balance = await time26.balanceOf(otherAccount.address);
    expect(balance.toString()).to.equal(
      ethers.utils.parseEther('80').toString()
    );
  });

  it('Should revert if non-owner tries to set pricing', async function () {
    const [owner, otherAccount, treasury] = await ethers.getSigners();
    const Time26 = await ethers.getContractFactory('Time26');
    const time26 = await Time26.deploy(owner.address);
    await time26.deployed();

    const ProofOfExistence =
      await ethers.getContractFactory('ProofOfExistence');
    const proof = await ProofOfExistence.deploy(
      time26.address,
      treasury.address,
      owner.address
    );
    await proof.deployed();

    try {
      await proof.connect(otherAccount).setPricing(0, 0, 0, 0, 0);
      expect.fail('Transaction should have reverted');
    } catch (error) {
      // Check for revert
      if (
        !error.message.includes('revert') &&
        !error.message.includes('OwnableUnauthorizedAccount')
      ) {
        console.log('Unexpected error:', error);
        expect.fail('Expected revert, got ' + error.message);
      }
    }
  });

  it('Should revert if allowance is insufficient for Time26 track', async function () {
    const [owner, otherAccount, treasury] = await ethers.getSigners();
    const Time26 = await ethers.getContractFactory('Time26');
    const time26 = await Time26.deploy(owner.address);
    await time26.deployed();

    const ProofOfExistence =
      await ethers.getContractFactory('ProofOfExistence');
    const proof = await ProofOfExistence.deploy(
      time26.address,
      treasury.address,
      owner.address
    );
    await proof.deployed();

    // Setup Pricing
    await proof.setPricing(
      0,
      0,
      ethers.utils.parseEther('10'),
      ethers.utils.parseEther('1'),
      45
    );

    // Mint tokens to otherAccount
    await time26.mint(otherAccount.address, ethers.utils.parseEther('100'));

    // Don't approve or approve too little
    await time26
      .connect(otherAccount)
      .approve(proof.address, ethers.utils.parseEther('1'));

    // Mint Eternal needs ~20 tokens
    try {
      await proof
        .connect(otherAccount)
        .mintEternalTime26(55, 'ipfs://fail', 'Fail Message');
      expect.fail('Transaction should have reverted');
    } catch (error) {
      if (!error.message.includes('revert')) {
        console.log('Unexpected error:', error);
        expect.fail('Expected revert, got ' + error.message);
      }
    }
  });
});
