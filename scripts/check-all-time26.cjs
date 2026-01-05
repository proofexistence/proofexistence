/**
 * Check all TIME26 token locations
 * Run: npx hardhat run scripts/check-all-time26.cjs --network polygon
 */
const { ethers } = require('hardhat');

async function main() {
  const TIME26 = '0x56C79b61FFc3D826188DB700791F1A7ECb007FD0';
  const time26 = await ethers.getContractAt(
    [
      'function balanceOf(address) view returns (uint256)',
      'function totalSupply() view returns (uint256)',
    ],
    TIME26
  );

  // All addresses to check - verified checksums
  const addresses = [
    {
      name: 'ProofRecorder v4',
      addr: '0x72Ac729a8f6efb68A5d6765EC375aC4578a3c756',
    },
    {
      name: 'Uniswap Pool',
      addr: '0xE11f0a3Acb5165015858a5FF8ba09746F26Ac05b',
    },
    {
      name: 'Main Safe (Team/Ops)',
      addr: '0xc7b9ED3e985706efeb951462d4281f4Ac8fc99B2',
    },
    {
      name: 'LP Phase 2&3 Wallet',
      addr: '0xd4A3FBBFaE24985A667F9FAf2c11C4687D72100A',
    },
    {
      name: 'Treasury Safe (new)',
      addr: '0xBDA2B288154339F88F886949F4CC9dF7D2491f6D',
    },
    {
      name: 'Sablier Linear',
      addr: '0x3962f6585946823440d274aD7C719B02b49DE51E',
    },
    {
      name: 'Sablier Dynamic',
      addr: '0x7CC7e125d83A581ff438608490Cc0f7bDff79127',
    },
    {
      name: 'Team Recipient',
      addr: '0x19C7223EfA11A6eCaaac4c943225CC6EFE12A5Fd',
    },
    { name: 'Deployer', addr: '0xA7D2A0647F1f12455f543Db4CaA350e85C0Eae09' },
    {
      name: 'Burn Address',
      addr: '0x000000000000000000000000000000000000dEaD',
    },
  ];

  const totalSupply = await time26.totalSupply();
  console.log('');
  console.log('='.repeat(70));
  console.log('TIME26 TOKEN DISTRIBUTION');
  console.log(
    'Total Supply: ' + ethers.formatUnits(totalSupply, 18) + ' TIME26'
  );
  console.log('='.repeat(70));
  console.log('');

  let totalFound = 0n;

  for (const { name, addr } of addresses) {
    try {
      const balance = await time26.balanceOf(addr);
      totalFound += balance;
      const formatted = parseFloat(ethers.formatUnits(balance, 18));
      if (formatted > 0) {
        const pct = ((formatted / 48420000) * 100).toFixed(2);
        console.log(
          `✓ ${name.padEnd(22)} ${formatted.toLocaleString().padStart(18)} TIME26  (${pct}%)`
        );
        console.log(`  ${addr}`);
        console.log('');
      }
    } catch (e) {
      console.log(`✗ ${name}: Error - ${e.message.slice(0, 40)}`);
    }
  }

  console.log('='.repeat(70));
  const foundNum = parseFloat(ethers.formatUnits(totalFound, 18));
  const missingNum = 48420000 - foundNum;
  console.log(
    `Total Found:   ${foundNum.toLocaleString().padStart(18)} TIME26`
  );
  console.log(
    `Missing:       ${missingNum.toLocaleString().padStart(18)} TIME26`
  );
  console.log('='.repeat(70));

  if (missingNum > 1000) {
    console.log('');
    console.log('⚠️  WARNING: Significant amount of TIME26 unaccounted for!');
    console.log('   Check PolygonScan for TIME26 holders:');
    console.log(
      '   https://polygonscan.com/token/0x56C79b61FFc3D826188DB700791F1A7ECb007FD0#balances'
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
