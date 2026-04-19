
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
});

async function checkUser() {
  const addr = '0xf6657F7019E481204D26882D6b1BED1da1541896';
  const code = await client.getBytecode({ address: addr });
  console.log(`Address ${addr} code length: ${code ? code.length : 0}`);
}

checkUser();
