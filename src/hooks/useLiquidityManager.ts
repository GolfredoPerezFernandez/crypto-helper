import { $, useSignal } from '@builder.io/qwik';
import { createPublicClient, createWalletClient, custom, http, parseAbi } from 'viem';
import { useWallet } from './useWallet';
import { CONTRACT_ADDRESSES } from '~/constants';

export const LIQUIDITY_MANAGER_ADDRESS = '0x38E26D5926Fd9cc12605C5B47587cC7479626778';

const LIQUIDITY_MANAGER_ABI = parseAbi([
  'function mintNewPosition((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0ToMint, uint256 amount1ToMint, address recipient) params) external returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
  'function collectAllFees(uint256 tokenId) public returns (uint256 amount0, uint256 amount1)',
  'function decreaseLiquidity(uint256 tokenId, uint128 liquidityToRemove) external returns (uint256 amount0, uint256 amount1)',
  'function increaseLiquidity(uint256 tokenId, uint256 amount0ToAdd, uint256 amount1ToAdd) external returns (uint128 liquidity, uint256 amount0, uint256 amount1)',
  'function getLiquidity(uint256 tokenId) external view returns (uint128 liquidity)',
  'function retrieveNFT(uint256 tokenId) external',
  'function deposits(uint256 tokenId) external view returns (address owner, uint128 liquidity, address token0, address token1)',
  'function nonfungiblePositionManager() view returns (address)'
]);

const ERC721_ENUMERABLE_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)'
]);

const NPM_ABI = parseAbi([
  'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)'
]);

export function useLiquidityManager() {
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

  const mintNewPosition = $(async (
    token0: string,
    token1: string,
    fee: number,
    tickLower: number,
    tickUpper: number,
    amount0ToMint: string,
    amount1ToMint: string
  ) => {
    const walletClient = await getWalletClient();
    if (!walletClient || !wallet.address) throw new Error('Wallet not connected');

    const recipient = wallet.address as `0x${string}`;
    console.log('[mintNewPosition] Minting with recipient:', recipient);

    const params = {
      token0: token0 as `0x${string}`,
      token1: token1 as `0x${string}`,
      fee,
      tickLower,
      tickUpper,
      amount0ToMint: BigInt(amount0ToMint),
      amount1ToMint: BigInt(amount1ToMint),
      recipient,
    };

    const hash = await walletClient.writeContract({
      address: LIQUIDITY_MANAGER_ADDRESS as `0x${string}`,
      abi: LIQUIDITY_MANAGER_ABI,
      functionName: 'mintNewPosition',
      args: [params],
      account: wallet.address as `0x${string}`
    });

    const publicClient = await getPublicClient();
    const wait = async () => {
      if (publicClient) {
        return publicClient.waitForTransactionReceipt({ hash });
      }
    };

    return { hash, wait };
  });

  const collectAllFees = $(async (tokenId: string) => {
    const walletClient = await getWalletClient();
    if (!walletClient || !wallet.address) throw new Error('Wallet not connected');

    const hash = await walletClient.writeContract({
      address: LIQUIDITY_MANAGER_ADDRESS as `0x${string}`,
      abi: LIQUIDITY_MANAGER_ABI,
      functionName: 'collectAllFees',
      args: [BigInt(tokenId)],
      account: wallet.address as `0x${string}`
    });

    const publicClient = await getPublicClient();
    const wait = async () => {
      if (publicClient) {
        return publicClient.waitForTransactionReceipt({ hash });
      }
    };

    return { hash, wait };
  });

  const decreaseLiquidity = $(async (tokenId: string, liquidityToRemove: string) => {
    const walletClient = await getWalletClient();
    if (!walletClient || !wallet.address) throw new Error('Wallet not connected');

    const hash = await walletClient.writeContract({
      address: LIQUIDITY_MANAGER_ADDRESS as `0x${string}`,
      abi: LIQUIDITY_MANAGER_ABI,
      functionName: 'decreaseLiquidity',
      args: [BigInt(tokenId), BigInt(liquidityToRemove)],
      account: wallet.address as `0x${string}`
    });

    const publicClient = await getPublicClient();
    const wait = async () => {
      if (publicClient) {
        return publicClient.waitForTransactionReceipt({ hash });
      }
    };

    return { hash, wait };
  });

  const increaseLiquidity = $(async (tokenId: string, amount0ToAdd: string, amount1ToAdd: string, token0Address: string, token1Address: string) => {
    const walletClient = await getWalletClient();
    if (!walletClient || !wallet.address) throw new Error('Wallet not connected');

    const publicClient = await getPublicClient();
    if (!publicClient) throw new Error('No public client');

    const args = [BigInt(tokenId), BigInt(amount0ToAdd), BigInt(amount1ToAdd)] as const;

    // Check balances
    const balance0 = await publicClient.readContract({
      address: token0Address as `0x${string}`,
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      functionName: 'balanceOf',
      args: [wallet.address as `0x${string}`]
    });

    const balance1 = await publicClient.readContract({
      address: token1Address as `0x${string}`,
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      functionName: 'balanceOf',
      args: [wallet.address as `0x${string}`]
    });

    console.log('Token 0 balance:', balance0.toString(), 'needed:', amount0ToAdd);
    console.log('Token 1 balance:', balance1.toString(), 'needed:', amount1ToAdd);

    if (balance0 < BigInt(amount0ToAdd)) {
      throw new Error(`Insufficient Token 0 balance. Have: ${balance0.toString()}, Need: ${amount0ToAdd}`);
    }

    if (balance1 < BigInt(amount1ToAdd)) {
      throw new Error(`Insufficient Token 1 balance. Have: ${balance1.toString()}, Need: ${amount1ToAdd}`);
    }

    // Check approvals
    const allowance0 = await publicClient.readContract({
      address: token0Address as `0x${string}`,
      abi: parseAbi(['function allowance(address,address) view returns (uint256)']),
      functionName: 'allowance',
      args: [wallet.address as `0x${string}`, LIQUIDITY_MANAGER_ADDRESS as `0x${string}`]
    });

    const allowance1 = await publicClient.readContract({
      address: token1Address as `0x${string}`,
      abi: parseAbi(['function allowance(address,address) view returns (uint256)']),
      functionName: 'allowance',
      args: [wallet.address as `0x${string}`, LIQUIDITY_MANAGER_ADDRESS as `0x${string}`]
    });

    console.log('Token 0 allowance:', allowance0.toString(), 'needed:', amount0ToAdd);
    console.log('Token 1 allowance:', allowance1.toString(), 'needed:', amount1ToAdd);

    if (allowance0 < BigInt(amount0ToAdd)) {
      throw new Error(`Insufficient Token 0 approval. Approved: ${allowance0.toString()}, Need: ${amount0ToAdd}. Please approve first.`);
    }

    if (allowance1 < BigInt(amount1ToAdd)) {
      throw new Error(`Insufficient Token 1 approval. Approved: ${allowance1.toString()}, Need: ${amount1ToAdd}. Please approve first.`);
    }

    // Verify ownership and details on-chain before simulation
    try {
        const deposit = await publicClient.readContract({
            address: LIQUIDITY_MANAGER_ADDRESS as `0x${string}`,
            abi: LIQUIDITY_MANAGER_ABI,
            functionName: 'deposits',
            args: [BigInt(tokenId)]
        });
        
        const owner = deposit[0];
        console.log(`[increaseLiquidity] Position ${tokenId} Owner: ${owner}`);
        console.log(`[increaseLiquidity] Sender (Wallet): ${wallet.address}`);
        
        if (owner.toLowerCase() !== wallet.address?.toLowerCase()) {
            throw new Error(`Ownership Mismatch! Position Owner: ${owner}, You: ${wallet.address}. This position is owned by a Smart Wallet. To manage it, connect as the Smart Wallet, or redeploy the contract with the 'recipient' fix.`);
        }
    } catch (e: any) {
        console.error('[increaseLiquidity] Pre-check failed:', e);
        throw e;
    }

    // Simulate first to catch errors
    try {
        await publicClient.simulateContract({
            address: LIQUIDITY_MANAGER_ADDRESS as `0x${string}`,
            abi: LIQUIDITY_MANAGER_ABI,
            functionName: 'increaseLiquidity',
            args: args,
            account: wallet.address as `0x${string}`
        });
    } catch (e: any) {
        console.error('Simulation failed:', e);
        // Try to extract a readable error
        const msg = e.message || e.toString();
        if (msg.includes('Not the owner')) throw new Error('You are not the owner of this position (Smart Wallet mismatch?)');
        if (msg.includes('STF') || msg.includes('TransferFromFailed')) throw new Error('Transfer failed. Check your token balance and approval.');
        if (msg.includes('SA') || msg.includes('SafeERC20: approve')) throw new Error('Approval failed.');
        // Generic revert
        throw new Error(`Transaction would revert: ${msg}`);
    }

    const hash = await walletClient.writeContract({
      address: LIQUIDITY_MANAGER_ADDRESS as `0x${string}`,
      abi: LIQUIDITY_MANAGER_ABI,
      functionName: 'increaseLiquidity',
      args: args,
      account: wallet.address as `0x${string}`
    });

    const wait = async () => {
      if (publicClient) {
        return publicClient.waitForTransactionReceipt({ hash });
      }
    };

    return { hash, wait };
  });

  const getPosition = $(async (tokenId: string) => {
    console.log('[getPosition] Fetching for tokenId:', tokenId);
    const publicClient = await getPublicClient();
    if (!publicClient) throw new Error('No public client');

    try {
      const deposit = await publicClient.readContract({
        address: LIQUIDITY_MANAGER_ADDRESS as `0x${string}`,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'deposits',
        args: [BigInt(tokenId)]
      });
      console.log('[getPosition] Deposit result:', deposit);
      return {
        owner: deposit[0],
        liquidity: deposit[1].toString(),
        token0: deposit[2],
        token1: deposit[3]
      };
    } catch (e) {
      console.error('[getPosition] Error:', e);
      throw e;
    }
  });

  const checkAllowance = $(async (tokenAddress: string, amount: string) => {
    const publicClient = await getPublicClient();
    if (!publicClient || !wallet.address) return false;

    const allowance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: parseAbi(['function allowance(address owner, address spender) view returns (uint256)']),
      functionName: 'allowance',
      args: [wallet.address as `0x${string}`, LIQUIDITY_MANAGER_ADDRESS as `0x${string}`]
    });

    return allowance >= BigInt(amount);
  });

  const approveToken = $(async (tokenAddress: string, amount: string) => {
    const walletClient = await getWalletClient();
    if (!walletClient || !wallet.address) throw new Error('Wallet not connected');

    const hash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: parseAbi(['function approve(address spender, uint256 amount) returns (bool)']),
      functionName: 'approve',
      args: [LIQUIDITY_MANAGER_ADDRESS as `0x${string}`, BigInt(amount)],
      account: wallet.address as `0x${string}`
    });

    const publicClient = await getPublicClient();
    const wait = async () => {
      if (publicClient) {
        return publicClient.waitForTransactionReceipt({ hash });
      }
    };

    return { hash, wait };
  });

  const getTokenBalance = $(async (tokenAddress: string) => {
    const publicClient = await getPublicClient();
    if (!publicClient || !wallet.address) return '0';

    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: parseAbi(['function balanceOf(address owner) view returns (uint256)']),
      functionName: 'balanceOf',
      args: [wallet.address as `0x${string}`]
    });

    return balance.toString();
  });

  const getAllPositions = $(async () => {
    const publicClient = await getPublicClient();
    if (!publicClient || !wallet.address) return [];

    try {
      console.log('Fetching NPM address from LM:', LIQUIDITY_MANAGER_ADDRESS);
      const npmAddress = await publicClient.readContract({
        address: LIQUIDITY_MANAGER_ADDRESS as `0x${string}`,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'nonfungiblePositionManager'
      });
      console.log('NPM Address:', npmAddress);

      if (!npmAddress || npmAddress === '0x0000000000000000000000000000000000000000') {
          console.error('Invalid NPM address');
          return [];
      }

      console.log('Fetching LM balance on NPM...');
      const balance = await publicClient.readContract({
        address: npmAddress,
        abi: ERC721_ENUMERABLE_ABI,
        functionName: 'balanceOf',
        args: [LIQUIDITY_MANAGER_ADDRESS as `0x${string}`]
      });
      console.log('LM Balance:', balance);

      if (balance === 0n) return [];

      // Fetch all token IDs in parallel
      const tokenPromises = [];
      for (let i = 0; i < Number(balance); i++) {
        tokenPromises.push(
          publicClient.readContract({
            address: npmAddress,
            abi: ERC721_ENUMERABLE_ABI,
            functionName: 'tokenOfOwnerByIndex',
            args: [LIQUIDITY_MANAGER_ADDRESS as `0x${string}`, BigInt(i)]
          })
        );
      }
      const tokenIds = await Promise.all(tokenPromises);
      console.log('Token IDs:', tokenIds);

      // Fetch deposits for all token IDs in parallel
      const depositPromises = tokenIds.map(id => 
        publicClient.readContract({
          address: LIQUIDITY_MANAGER_ADDRESS as `0x${string}`,
          abi: LIQUIDITY_MANAGER_ABI,
          functionName: 'deposits',
          args: [id]
        }).then(dep => ({ id, dep }))
      );

      const deposits = await Promise.all(depositPromises);
      
      console.log('Current Wallet:', wallet.address);
      deposits.forEach(({ id, dep }) => {
        console.log(`Token #${id}: Owner ${dep[0]}, Liquidity ${dep[1]}`);
        console.log(`Is Owner? ${dep[0].toLowerCase() === wallet.address?.toLowerCase()}`);
      });

      const myPositions = deposits
        // Show all positions managed by this contract, allowing Smart Wallets to be visible
        // .filter(({ dep }) => dep[0].toLowerCase() === wallet.address!.toLowerCase())
        .map(({ id, dep }) => ({
          tokenId: id.toString(),
          owner: dep[0],
          liquidity: dep[1].toString(),
          token0: dep[2],
          token1: dep[3],
          isOwner: dep[0].toLowerCase() === wallet.address!.toLowerCase()
        }));
      
      console.log('My Positions:', myPositions);
      return myPositions;

    } catch (e) {
      console.error('Error fetching positions:', e);
      return [];
    }
  });

  const getPositionDetails = $(async (tokenId: string) => {
    console.log('[getPositionDetails] Fetching for tokenId:', tokenId);
    const publicClient = await getPublicClient();
    if (!publicClient) throw new Error('No public client');

    // First get NPM address
    const npmAddress = await publicClient.readContract({
      address: LIQUIDITY_MANAGER_ADDRESS as `0x${string}`,
      abi: LIQUIDITY_MANAGER_ABI,
      functionName: 'nonfungiblePositionManager'
    });
    console.log('[getPositionDetails] NPM Address:', npmAddress);

    if (!npmAddress || npmAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Invalid NPM address');
    }

    try {
      const position = await publicClient.readContract({
        address: npmAddress,
        abi: NPM_ABI,
        functionName: 'positions',
        args: [BigInt(tokenId)]
      });
      console.log('[getPositionDetails] NPM Position:', position);

      return {
        nonce: position[0],
        operator: position[1],
        token0: position[2],
        token1: position[3],
        fee: position[4],
        tickLower: position[5],
        tickUpper: position[6],
        liquidity: position[7].toString(),
        feeGrowthInside0LastX128: position[8].toString(),
        feeGrowthInside1LastX128: position[9].toString(),
        tokensOwed0: position[10].toString(),
        tokensOwed1: position[11].toString()
      };
    } catch (e) {
      console.error('[getPositionDetails] Error fetching from NPM:', e);
      throw e;
    }
  });

  const retrieveNFT = $(async (tokenId: string) => {
    const walletClient = await getWalletClient();
    if (!walletClient || !wallet.address) throw new Error('Wallet not connected');

    const hash = await walletClient.writeContract({
      address: LIQUIDITY_MANAGER_ADDRESS as `0x${string}`,
      abi: LIQUIDITY_MANAGER_ABI,
      functionName: 'retrieveNFT',
      args: [BigInt(tokenId)],
      account: wallet.address as `0x${string}`
    });

    const publicClient = await getPublicClient();
    const wait = async () => {
      if (publicClient) {
        return publicClient.waitForTransactionReceipt({ hash });
      }
    };

    return { hash, wait };
  });

  return {
    mintNewPosition,
    collectAllFees,
    decreaseLiquidity,
    increaseLiquidity,
    getPosition,
    getPositionDetails,
    checkAllowance,
    approveToken,
    getTokenBalance,
    getAllPositions,
    retrieveNFT
  };
}
