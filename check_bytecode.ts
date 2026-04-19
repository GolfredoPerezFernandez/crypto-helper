
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
});

async function checkBytecode() {
  const addr = '0x29Fa3BC3309E769E36C01Df92815837475361BaF';
  const code = await client.getBytecode({ address: addr });
  const target = '8B6B008A0073D34D04ff00210E7200Ab00003300'.toLowerCase();
  
  if (code && code.toLowerCase().includes(target)) {
    console.log('FOUND the address in the bytecode!');
  } else {
    console.log('Address NOT found in bytecode.');
  }
}

checkBytecode();
