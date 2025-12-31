const hre = require('hardhat');

async function main() {
  const provider = new hre.ethers.providers.JsonRpcProvider(
    'https://rpc-amoy.polygon.technology'
  );

  const addresses = [
    {
      name: 'POE (contracts.ts)',
      address: '0x208A30a20A888573C9077c176b3abd4048ed05f1',
    },
    {
      name: 'POE (verify script)',
      address: '0xDC7764518C0FC5a86AB5260f3af4799Ca375Fb65',
    },
    {
      name: 'TIME26 (contracts.ts)',
      address: '0x0C17f797C508E0ef6c336e589A2bdA0cA18cba7a',
    },
  ];

  console.log('Checking contracts on Amoy...'); // Corrected closing quote

  for (const { name, address } of addresses) {
    const code = await provider.getCode(address);
    const hasCode = code !== '0x';
    console.log(`${name}: ${address} -> ${hasCode ? 'HAS CODE' : 'NO CODE'}`);

    if (hasCode && name.includes('POE')) {
      try {
        const contract = new hre.ethers.Contract(
          address,
          ['function time26Token() view returns (address)'],
          provider
        );
        const time26 = await contract.time26Token();
        console.log(`  -> Linked Time26: ${time26}`);

        const time26Code = await provider.getCode(time26);
        console.log(`  -> Time26 Has Code: ${time26Code !== '0x'}`);
      } catch (e) {
        console.log(`  -> Failed to get time26Token: ${e.message}`);
      }
    }
  }
}

main().catch(console.error);
