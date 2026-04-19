import { $, useSignal, useStore } from '@builder.io/qwik';
import { createPublicClient, createWalletClient, custom, http, parseAbi, encodePacked } from 'viem';
import { useWallet } from './useWallet';
import { CONTRACT_ADDRESSES } from '~/constants';

export const SWAP_MULTIHOP_ADDRESS = CONTRACT_ADDRESSES.BASE.SWAP_ROUTER_V3;
export const QUOTER_ADDRESS = CONTRACT_ADDRESSES.BASE.QUOTER_V2;

const MULTIHOP_ABI = parseAbi([
  // NOTE: SwapRouter02 (IV3SwapRouter) does NOT include `deadline` in ExactInputParams.
  // Deadline enforcement is done via multicall(uint256 deadline, bytes[] data) wrapper.
  'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)',
  'function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
]);

export function useSwapMultihop() {
  const { wallet, BASE_NETWORK } = useWallet();

  const getPublicClient = $(() => {
    if (!BASE_NETWORK) return null;
    return createPublicClient({
      chain: BASE_NETWORK,
      transport: http(BASE_NETWORK.rpcUrls.default.http[0])
    });
  });

  const getWalletClient = $(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return null;
    const client = createWalletClient({
      chain: BASE_NETWORK,
      transport: custom(window.ethereum)
    });
    return client;
  });

  // Path encoding helper
  // For ExactInput: tokenIn - fee - tokenMid - fee - tokenOut
  // For ExactOutput: tokenOut - fee - tokenMid - fee - tokenIn
  const encodePath = $((tokens: string[], fees: number[]) => {
    if (tokens.length !== fees.length + 1) {
      throw new Error('Invalid path: tokens length must be fees length + 1');
    }

    const types: string[] = [];
    const values: any[] = [];

    for (let i = 0; i < fees.length; i++) {
      types.push('address');
      types.push('uint24');
      values.push(tokens[i]);
      values.push(fees[i]);
    }
    types.push('address');
    values.push(tokens[tokens.length - 1]);

    return encodePacked(types, values);
  });

  const previewSwapMultihop = $(async (
    tokens: string[], // [In, Mid, Out]
    fees: number[],   // [Fee1, Fee2]
    amountIn: string
  ) => {
    const publicClient = await getPublicClient();
    if (!publicClient) throw new Error('No public client');

    const path = await encodePath(tokens, fees);

    try {
      // Use QuoterV2
      const result = await publicClient.readContract({
        address: QUOTER_ADDRESS as `0x${string}`,
        abi: MULTIHOP_ABI,
        functionName: 'quoteExactInput',
        args: [path, BigInt(amountIn)]
      });
      // Result is [amountOut, sqrtPriceX96After, ...]
      // We want the first element
      return (result as any)[0].toString();
    } catch (error) {
      // console.warn('Path not available:', error); // Optional: uncomment for debugging
      throw error;
    }
  });

  const swapExactInputMultihop = $(async (
    tokens: string[],
    fees: number[],
    amountIn: string,
    amountOutMinimum: string,
    isNative: boolean = false
  ) => {
    const walletClient = await getWalletClient();
    if (!walletClient || !wallet.address) throw new Error('Wallet not connected');

    // 1. Check & Handle Approvals only if NOT Native ETH payment
    // 1. Approvals are handled externally
    // leaving isNative check just for value handling below

    const path = await encodePath(tokens, fees);

    const params = {
      path,
      recipient: wallet.address as `0x${string}`,
      amountIn: BigInt(amountIn),
      amountOutMinimum: BigInt(amountOutMinimum)
    };

    // Simulate first to catch errors
    const publicClient = await getPublicClient();
    if (publicClient) {
      await publicClient.simulateContract({
        address: SWAP_MULTIHOP_ADDRESS as `0x${string}`,
        abi: MULTIHOP_ABI,
        functionName: 'exactInput',
        args: [params],
        account: wallet.address as `0x${string}`,
        value: isNative ? BigInt(amountIn) : BigInt(0)
      });
    }

    const hash = await walletClient.writeContract({
      address: SWAP_MULTIHOP_ADDRESS as `0x${string}`,
      abi: MULTIHOP_ABI,
      functionName: 'exactInput',
      args: [params],
      account: wallet.address as `0x${string}`,
      value: isNative ? BigInt(amountIn) : BigInt(0)
    });


    const wait = async () => {
      if (publicClient) {
        return publicClient.waitForTransactionReceipt({ hash });
      }
    };

    return { hash, wait };
  });

  return {
    previewSwapMultihop,
    swapExactInputMultihop,
    encodePath
  };
}
