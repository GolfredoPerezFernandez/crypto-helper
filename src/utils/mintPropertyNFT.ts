import { createWalletClient, custom } from 'viem';

// ABI simplificado para mintear NFTs - solo las funciones necesarias
const SIMPLE_NFT_ABI = [
  {
    name: 'safeMint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'uri', type: 'string' }
    ],
    outputs: []
  }
] as const;

// You must provide the correct contract address for PropertyNFT
const PROPERTY_NFT_ADDRESS = import.meta.env.PUBLIC_NFT_CONTRACT_ADDRESS || import.meta.env.PUBLIC_NFT_ADDRESS || '';

// Extiende el tipo Window para incluir ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function mintPropertyNFT({ to, uri }: { to: string; uri: string }) {
  if (!window.ethereum) throw new Error('MetaMask not found');
  if (!PROPERTY_NFT_ADDRESS) throw new Error('PropertyNFT contract address not set');

  const client = createWalletClient({
    chain: undefined, // O especifica la chain si la sabes
    transport: custom(window.ethereum)
  });

  const [account] = await client.getAddresses();
  if (!account) throw new Error('No account connected');

  const hash = await client.writeContract({
    address: PROPERTY_NFT_ADDRESS as `0x${string}`,
    abi: SIMPLE_NFT_ABI,
    functionName: 'safeMint',
    args: [to as `0x${string}`, uri],
    account,
    chain: undefined // explícitamente requerido por viem
  });

  return { success: true, transactionHash: hash };
}
