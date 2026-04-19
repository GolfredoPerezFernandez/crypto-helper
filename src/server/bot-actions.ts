import { server$ } from '@builder.io/qwik-city';
import { db } from '~/lib/turso';
import { users } from '../../drizzle/schema';
import { decrypt } from '~/utils/server/crypto';
import { createWalletClient, createPublicClient, http, parseAbi, encodePacked, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getNetworkConfig } from '~/utils/blockchain';
import { eq } from 'drizzle-orm';
import { CONTRACT_ADDRESSES } from '~/constants';

const SWAP_MULTIHOP_ADDRESS = CONTRACT_ADDRESSES.BASE.SWAP_ROUTER_V3;

export interface BotTradeParams {
    tokens: string[];
    fees: number[];
    amountIn: string;
    amountOutMinimum: string;
    isNative: boolean;
    tokenInAddress: string;
}

export const executeBotTrade = server$(async function (params: BotTradeParams) {
    // 1. Get User from Cookie/Session
    const cookie = this.cookie;
    const userIdCookie = cookie.get('user_id');

    if (!userIdCookie?.value) {
        return { success: false, message: "User not authenticated" };
    }

    const userId = parseInt(userIdCookie.value);

    try {
        // 2. Fetch User & Decrypt Key
        const user = await db.select().from(users).where(eq(users.id, userId)).get();
        if (!user || !user.encryptedPrivateKey || !user.iv) {
            return { success: false, message: "No managed wallet found" };
        }

        const privateKey = decrypt(user.encryptedPrivateKey, user.iv);
        const account = privateKeyToAccount(privateKey as `0x${string}`);

        // 3. Setup Viem Clients
        const config = getNetworkConfig();
        // Force Base Mainnet for bot if needed, or use config
        const rpcUrl = config.rpcUrl;

        // Define Chain object for Viem
        const chain = {
            id: config.id,
            name: config.name,
            nativeCurrency: config.nativeCurrency,
            rpcUrls: {
                default: { http: [config.rpcUrl] },
                public: { http: [config.rpcUrl] }
            }
        } as const;

        const publicClient = createPublicClient({
            chain,
            transport: http(rpcUrl)
        });

        const walletClient = createWalletClient({
            account,
            chain,
            transport: http(rpcUrl)
        });

        // 4. Encode Path
        const { tokens, fees, amountIn, amountOutMinimum, isNative, tokenInAddress } = params;

        // Custom encode logic matching client
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

        const path = encodePacked(types, values);

        // 5. Handle Approval (if not native)
        if (!isNative) {
            const allowance = await publicClient.readContract({
                address: tokenInAddress as `0x${string}`,
                abi: parseAbi(['function allowance(address,address) view returns (uint256)']),
                functionName: 'allowance',
                args: [account.address, SWAP_MULTIHOP_ADDRESS as `0x${string}`]
            });

            if (BigInt(allowance as any) < BigInt(amountIn)) {
                // console.log('Server Bot: Approving...');
                const hashApprove = await walletClient.writeContract({
                    address: tokenInAddress as `0x${string}`,
                    abi: parseAbi(['function approve(address,uint256) returns (bool)']),
                    functionName: 'approve',
                    args: [SWAP_MULTIHOP_ADDRESS as `0x${string}`, BigInt(amountIn)]
                });
                await publicClient.waitForTransactionReceipt({ hash: hashApprove });
            }
        }

        // 6. Execute Swap
        const swapParams = {
            path,
            recipient: account.address,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
            amountIn: BigInt(amountIn),
            amountOutMinimum: BigInt(amountOutMinimum)
        };

        // Simulate first? (Optional, helps debug)
        /*
        await publicClient.simulateContract({
            address: SWAP_MULTIHOP_ADDRESS as `0x${string}`,
            abi: parseAbi(['function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)']),
            functionName: 'exactInput',
            args: [swapParams],
            value: isNative ? BigInt(amountIn) : BigInt(0)
        });
        */

        const hash = await walletClient.writeContract({
            address: SWAP_MULTIHOP_ADDRESS as `0x${string}`,
            abi: parseAbi(['function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)']),
            functionName: 'exactInput',
            args: [swapParams],
            value: isNative ? BigInt(amountIn) : BigInt(0)
        });

        // Wait for it? Or return hash immediately?
        // Bot UI expects to wait usually, but we can return hash and let UI poll if we want.
        // For server action, better to wait so we confirm success? 
        // Returning hash allows UI to track it.

        return { success: true, hash };

    } catch (error: any) {
        console.error('Server Bot execution failed:', error);
        return { success: false, message: error.message || 'Execution failed' };
    }
});
