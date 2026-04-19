import { $, useSignal, useTask$, noSerialize, type NoSerialize } from '@builder.io/qwik';
import { createPublicClient, http, parseAbi } from 'viem';
import { BASE_NETWORK } from './useWallet';
import { CONTRACT_ADDRESSES } from '~/constants';
import { Token } from '@uniswap/sdk-core';
import { Pool } from '@uniswap/v3-sdk';

const FACTORY_ABI = parseAbi([
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
]);

const POOL_ABI = parseAbi([
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() external view returns (uint128)',
  'function tickSpacing() external view returns (int24)'
]);

export interface PoolData {
  poolAddress: string | null;
  currentPrice: string | null;
  currentTick: number | null;
  tickSpacing: number;
  isLoading: boolean;
  error: string | null;
  pool: NoSerialize<Pool> | null;
  sqrtPriceX96: string | null;
}

export function usePoolData() {
  
  const poolData = useSignal<PoolData>({
    poolAddress: null,
    currentPrice: null,
    currentTick: null,
    tickSpacing: 60, // Default for 0.3%
    isLoading: false,
    error: null,
    pool: null,
    sqrtPriceX96: null
  });

  const fetchPoolData = $(async (token0: any, token1: any, fee: number) => {
    if (!BASE_NETWORK || !token0.address || !token1.address) return;

    poolData.value.isLoading = true;
    poolData.value.error = null;

    try {
      console.log('Fetching pool data for:', token0.symbol, token1.symbol, fee);
      const publicClient = createPublicClient({
        chain: BASE_NETWORK,
        transport: http(BASE_NETWORK.rpcUrls.default.http[0], {
            timeout: 10000 // 10s timeout
        })
      });

      // 1. Get Pool Address
      console.log('Reading pool address from factory:', CONTRACT_ADDRESSES.BASE.POOL_FACTORY_ADDRESS);
      const poolAddress = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.BASE.POOL_FACTORY_ADDRESS as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'getPool',
        args: [token0.address as `0x${string}`, token1.address as `0x${string}`, fee]
      });
      console.log('Pool address found:', poolAddress);

      if (poolAddress === '0x0000000000000000000000000000000000000000') {
        console.log('Pool does not exist');
        poolData.value = {
          ...poolData.value,
          poolAddress: null,
          currentPrice: null,
          currentTick: null,
          isLoading: false,
          error: 'Pool not found',
          sqrtPriceX96: null
        };
        return;
      }

      // 2. Get Slot0 and Liquidity
      console.log('Fetching slot0 and liquidity...');
      const [slot0, liquidity, tickSpacing] = await Promise.all([
        publicClient.readContract({
          address: poolAddress,
          abi: POOL_ABI,
          functionName: 'slot0'
        }),
        publicClient.readContract({
          address: poolAddress,
          abi: POOL_ABI,
          functionName: 'liquidity'
        }),
        publicClient.readContract({
            address: poolAddress,
            abi: POOL_ABI,
            functionName: 'tickSpacing'
        }).catch(() => {
            console.warn('tickSpacing fetch failed, using default');
            if (fee === 100) return 1;
            if (fee === 500) return 10;
            if (fee === 3000) return 60;
            if (fee === 10000) return 200;
            return 60;
        })
      ]);
      console.log('Pool data fetched:', { slot0, liquidity, tickSpacing });

      const [sqrtPriceX96, tick] = slot0;

      // 3. Create SDK Pool instance to calculate price
      const tokenA = new Token(8453, token0.address, token0.decimals, token0.symbol, token0.name);
      const tokenB = new Token(8453, token1.address, token1.decimals, token1.symbol, token1.name);

      const pool = new Pool(
        tokenA,
        tokenB,
        fee,
        sqrtPriceX96.toString(),
        liquidity.toString(),
        tick
      );

      // Get price of Token0 in terms of Token1
      const price0 = pool.token0Price.toSignificant(6);
      const price1 = pool.token1Price.toSignificant(6);
      console.log('Calculated prices:', { price0, price1 });

      // We usually want to show the price of the "base" token (e.g. ETH price in USDC)
      // If token0 is WETH and token1 is USDC, price0 is USDC per WETH.
      // The UI usually handles inversion based on user preference, but we'll store the pool object to help.

      poolData.value = {
        poolAddress,
        currentPrice: price0, // Default to token0 price
        currentTick: tick,
        tickSpacing: Number(tickSpacing),
        isLoading: false,
        error: null,
        pool: noSerialize(pool),
        sqrtPriceX96: sqrtPriceX96.toString()
      };
      
    } catch (e: any) {
      console.error('Error fetching pool data:', e);
      poolData.value = {
        ...poolData.value,
        isLoading: false,
        error: e.message || 'Error fetching pool data'
      };
    }
  });

  return {
    poolData,
    fetchPoolData
  };
}
