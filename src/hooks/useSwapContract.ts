import { $ } from '@builder.io/qwik';
import { createPublicClient, http, createWalletClient, custom } from 'viem';
import { useWallet } from './useWallet';
import { CONTRACT_ADDRESSES } from '~/constants';

export const SWAP_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.BASE.SWAP_TOKEN_CONTRACT;

const SWAP_ABI = [
  {
    inputs: [
      { internalType: "address", name: "tokenIn", type: "address" },
      { internalType: "address", name: "tokenOut", type: "address" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMinimum", type: "uint256" },
      { internalType: "uint24", name: "fee", type: "uint24" }
    ],
    name: "swapExactInputSingle",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "tokenIn", type: "address" },
      { internalType: "address", name: "tokenOut", type: "address" },
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint256", name: "amountInMaximum", type: "uint256" },
      { internalType: "uint24", name: "fee", type: "uint24" }
    ],
    name: "swapExactOutputSingle",
    outputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "tokenIn", type: "address" },
      { internalType: "address", name: "tokenOut", type: "address" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint24", name: "fee", type: "uint24" }
    ],
    name: "getAmountOutMin",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "tokenIn", type: "address" },
      { internalType: "address", name: "tokenOut", type: "address" },
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint24", name: "fee", type: "uint24" }
    ],
    name: "getAmountInMax",
    outputs: [{ internalType: "uint256", name: "amountIn", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "token", "type": "address" },
      { internalType: "uint256", name: "amount", "type": "uint256" }
    ],
    name: "withdrawToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

export function useSwapContract() {
  const { wallet, BASE_NETWORK } = useWallet();

  const getPublicClient = $(() => {
    return createPublicClient({
      chain: BASE_NETWORK,
      transport: http(BASE_NETWORK.rpcUrls.default.http[0])
    });
  });

  const getWalletClient = $(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return null;
    return createWalletClient({
      chain: BASE_NETWORK,
      transport: custom(window.ethereum)
    });
  });

  // --- READ / PREVIEW FUNCTIONS ---

  const previewSwapExactInput = $(async (tokenIn: string, tokenOut: string, amountIn: string, fee: number = 3000) => {
    const publicClient = await getPublicClient();
    try {
      // We use simulateContract to get the return value of the function without executing it
      const { result } = await publicClient.simulateContract({
        address: SWAP_CONTRACT_ADDRESS as `0x${string}`,
        abi: SWAP_ABI,
        functionName: 'getAmountOutMin',
        args: [tokenIn as `0x${string}`, tokenOut as `0x${string}`, BigInt(amountIn), fee],
      });
      return result.toString();
    } catch (e) {
      console.error("Error previewing swap input:", e);
      throw e;
    }
  });

  const previewSwapExactOutput = $(async (tokenIn: string, tokenOut: string, amountOut: string, fee: number = 3000) => {
    const publicClient = await getPublicClient();
    try {
      const { result } = await publicClient.simulateContract({
        address: SWAP_CONTRACT_ADDRESS as `0x${string}`,
        abi: SWAP_ABI,
        functionName: 'getAmountInMax',
        args: [tokenIn as `0x${string}`, tokenOut as `0x${string}`, BigInt(amountOut), fee],
      });
      return result.toString();
    } catch (e) {
      console.error("Error previewing swap output:", e);
      throw e;
    }
  });

  // --- WRITE FUNCTIONS ---

  const swapExactInput = $(async (
    tokenIn: string, 
    tokenOut: string, 
    amountIn: string, 
    amountOutMinimum: string, 
    fee: number = 3000
  ) => {
    const walletClient = await getWalletClient();
    const publicClient = await getPublicClient();
    if (!walletClient || !wallet.address) throw new Error("Wallet not connected");

    const hash = await walletClient.writeContract({
      address: SWAP_CONTRACT_ADDRESS as `0x${string}`,
      abi: SWAP_ABI,
      functionName: 'swapExactInputSingle',
      args: [
        tokenIn as `0x${string}`, 
        tokenOut as `0x${string}`, 
        BigInt(amountIn), 
        BigInt(amountOutMinimum), 
        fee
      ],
      account: wallet.address as `0x${string}`
    });

    return {
      hash,
      wait: () => publicClient.waitForTransactionReceipt({ hash })
    };
  });

  const swapExactOutput = $(async (
    tokenIn: string, 
    tokenOut: string, 
    amountOut: string, 
    amountInMaximum: string, 
    fee: number = 3000
  ) => {
    const walletClient = await getWalletClient();
    const publicClient = await getPublicClient();
    if (!walletClient || !wallet.address) throw new Error("Wallet not connected");

    const hash = await walletClient.writeContract({
      address: SWAP_CONTRACT_ADDRESS as `0x${string}`,
      abi: SWAP_ABI,
      functionName: 'swapExactOutputSingle',
      args: [
        tokenIn as `0x${string}`, 
        tokenOut as `0x${string}`, 
        BigInt(amountOut), 
        BigInt(amountInMaximum), 
        fee
      ],
      account: wallet.address as `0x${string}`
    });

    return {
      hash,
      wait: () => publicClient.waitForTransactionReceipt({ hash })
    };
  });

  const withdrawToken = $(async (token: string, amount: string) => {
    const walletClient = await getWalletClient();
    const publicClient = await getPublicClient();
    if (!walletClient || !wallet.address) throw new Error("Wallet not connected");

    const hash = await walletClient.writeContract({
      address: SWAP_CONTRACT_ADDRESS as `0x${string}`,
      abi: SWAP_ABI,
      functionName: 'withdrawToken',
      args: [token as `0x${string}`, BigInt(amount)],
      account: wallet.address as `0x${string}`
    });

    return {
      hash,
      wait: () => publicClient.waitForTransactionReceipt({ hash })
    };
  });

  return {
    previewSwapExactInput,
    previewSwapExactOutput,
    swapExactInput,
    swapExactOutput,
    withdrawToken
  };
}
