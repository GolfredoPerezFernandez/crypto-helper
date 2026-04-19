import { server$ } from '@builder.io/qwik-city';
import { users } from '../../drizzle/schema';
import { migrateHintMessage } from '~/server/db-errors';
import { hashPassword, verifyPassword, setCookies } from '~/utils/auth';
import { encrypt, decrypt } from '~/utils/server/crypto';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { verifyMessage } from 'viem';
import { eq } from 'drizzle-orm';
import { ADMIN_WALLETS } from '~/constants';

/** Avoid static `import ~/lib/turso` — that pulls libsql into the browser when this file is loaded from layout. */
async function loadTursoDb() {
    return (await import('~/lib/turso')).db;
}

const walletLoginChallenges = new Map<string, { message: string; exp: number }>();

/** After a valid MetaMask signature, new wallets (or legacy placeholder emails) must submit a real email. */
const pendingMetamaskSignups = new Map<string, { exp: number; userId?: number }>();

function isReservedPlaceholderEmail(email: string): boolean {
    return email.toLowerCase().trim().endsWith("@crypto-ghost.internal");
}

function isValidEmailFormat(email: string): boolean {
    const s = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export interface AuthResult {
    success: boolean;
    message?: string;
    /** Wallet signed OK but account needs a real email (first-time MetaMask or legacy placeholder). */
    needsEmail?: boolean;
    user?: {
        id: number;
        email: string;
        name: string;
        walletAddress?: string | null;
    };
}

export interface ExportKeyResult {
    success: boolean;
    message?: string;
    privateKey?: string;
}

export const registerUser = server$(async function (data: { email: string, password: string, name?: string }): Promise<AuthResult> {
    const { email, password, name } = data;

    if (!email || !password || password.length < 6) {
        return { success: false, message: "Invalid email or password (min 6 chars)" };
    }

    try {
        const db = await loadTursoDb();
        // 1. Check if user exists
        const existing = await db.select().from(users).where(eq(users.email, email)).get();
        if (existing) {
            return { success: false, message: "Email already registered" };
        }

        // 2. Hash Password
        const hashedPassword = await hashPassword(password);

        // 3. Generate Wallet (Managed)
        const privateKey = generatePrivateKey();
        const account = privateKeyToAccount(privateKey);
        const walletAddress = account.address.toLowerCase() as `0x${string}`;

        // 4. Encrypt Private Key
        const { iv, content: encryptedPrivateKey } = encrypt(privateKey);

        // 5. Insert into DB
        const result = await db.insert(users).values({
            email,
            name: name || email.split('@')[0],
            password: hashedPassword,
            walletAddress,
            encryptedPrivateKey,
            iv,
            type: 'normal',
            authProvider: 'email',
        }).returning().get();

        // 6. Set Auth Cookies
        // 'this' context in server$ contains requestEvent properties like cookie, env, etc.
        const isAdmin =
            walletAddress && ADMIN_WALLETS.some((w) => w.toLowerCase() === walletAddress.toLowerCase());
        setCookies(this, result.id, isAdmin ? 'admin' : 'normal');

        return {
            success: true,
            user: {
                id: result.id,
                email: result.email,
                name: result.name || '',
                walletAddress: result.walletAddress
            }
        };

    } catch (err: any) {
        console.error('Registration error:', err);
        const hint = migrateHintMessage(err);
        return { success: false, message: hint || 'Internal Server Error' };
    }
});

export const loginUser = server$(async function (data: { email: string, password: string }): Promise<AuthResult> {
    const { email, password } = data;

    if (!email || !password) {
        return { success: false, message: "Email and password required" };
    }

    try {
        const db = await loadTursoDb();
        // 1. Find user
        const user = await db.select().from(users).where(eq(users.email, email)).get();

        if (!user || !user.password) {
            return { success: false, message: "Invalid credentials" };
        }

        // 2. Verify Password
        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            return { success: false, message: "Invalid credentials" };
        }

        // 3. Set Auth Cookies
        const isAdmin =
            user.walletAddress &&
            ADMIN_WALLETS.some((w) => w.toLowerCase() === String(user.walletAddress).toLowerCase());
        setCookies(this, user.id, isAdmin ? 'admin' : (user.type as any) || 'normal');

        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name || '',
                walletAddress: user.walletAddress
            }
        };

    } catch (err: any) {
        console.error('Login error:', err);
        const hint = migrateHintMessage(err);
        return { success: false, message: hint || 'Internal Server Error' };
    }
});

export const requestWalletLoginChallenge = server$(async function (address: string): Promise<{ success: boolean; message?: string }> {
    const a = String(address || "").trim().toLowerCase() as `0x${string}`;
    if (!a.startsWith("0x") || a.length < 10) {
        return { success: false, message: "Invalid wallet address" };
    }
    const nonce = crypto.randomUUID();
    const message = `Crypto Helper — Sign in\nWallet: ${a}\nNonce: ${nonce}\nTime: ${new Date().toISOString()}`;
    walletLoginChallenges.set(a, { message, exp: Date.now() + 10 * 60_000 });
    return { success: true, message };
});

export const loginWithWalletSignature = server$(async function (data: {
    address: string;
    signature: `0x${string}`;
}): Promise<AuthResult> {
    const a = String(data.address || "").trim().toLowerCase() as `0x${string}`;
    const key = a;
    const rec = walletLoginChallenges.get(key);
    if (!rec || Date.now() > rec.exp) {
        return { success: false, message: "Challenge expired. Request a new sign-in." };
    }
    const ok = await verifyMessage({
        address: a as `0x${string}`,
        message: rec.message,
        signature: data.signature,
    });
    if (!ok) {
        return { success: false, message: "Invalid signature" };
    }
    walletLoginChallenges.delete(key);

    try {
        const db = await loadTursoDb();
        const user = await db.select().from(users).where(eq(users.walletAddress, a)).get();
        if (!user) {
            pendingMetamaskSignups.set(key, { exp: Date.now() + 10 * 60_000 });
            return {
                success: false,
                needsEmail: true,
                message: "Add your email to finish creating your account.",
            };
        }
        if (user.email && isReservedPlaceholderEmail(user.email)) {
            pendingMetamaskSignups.set(key, { exp: Date.now() + 10 * 60_000, userId: user.id });
            return {
                success: false,
                needsEmail: true,
                message: "Add a real email address for your account.",
            };
        }

        const isAdminUser =
            user.walletAddress &&
            ADMIN_WALLETS.some((w) => w.toLowerCase() === String(user.walletAddress).toLowerCase());
        setCookies(this, user.id, isAdminUser ? "admin" : (user.type as any) || "normal");

        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name || "",
                walletAddress: user.walletAddress,
            },
        };
    } catch (err: any) {
        console.error('Wallet login DB error:', err);
        const hint = migrateHintMessage(err);
        return { success: false, message: hint || 'Wallet sign-in failed' };
    }
});

export const completeMetamaskSignup = server$(async function (data: {
    address: string;
    email: string;
}): Promise<AuthResult> {
    const a = String(data.address || "").trim().toLowerCase() as `0x${string}`;
    const emailNorm = String(data.email || "").trim().toLowerCase();

    if (!a.startsWith("0x") || a.length < 10) {
        return { success: false, message: "Invalid wallet address." };
    }

    const pending = pendingMetamaskSignups.get(a);
    if (!pending || Date.now() > pending.exp) {
        return {
            success: false,
            message: "Session expired. Sign in with MetaMask again.",
        };
    }

    if (!emailNorm || !isValidEmailFormat(emailNorm)) {
        return { success: false, message: "Enter a valid email address." };
    }
    if (isReservedPlaceholderEmail(emailNorm)) {
        return { success: false, message: "Use a real email address." };
    }

    try {
        const db = await loadTursoDb();
        const existingWithEmail = await db.select().from(users).where(eq(users.email, emailNorm)).get();

        if (pending.userId != null) {
            const row = await db.select().from(users).where(eq(users.id, pending.userId)).get();
            if (!row || String(row.walletAddress || "").toLowerCase() !== a) {
                pendingMetamaskSignups.delete(a);
                return { success: false, message: "Account mismatch. Try signing in again." };
            }
            if (existingWithEmail && existingWithEmail.id !== row.id) {
                return {
                    success: false,
                    message:
                        "This email is already registered. Log in with email or use a different email.",
                };
            }
            const newName =
                row.name && String(row.name).startsWith("Wallet ") ? emailNorm.split("@")[0] : row.name || emailNorm.split("@")[0];
            await db
                .update(users)
                .set({ email: emailNorm, name: newName })
                .where(eq(users.id, row.id));
            pendingMetamaskSignups.delete(a);
            const user = await db.select().from(users).where(eq(users.id, row.id)).get();
            if (!user) return { success: false, message: "Update failed." };
            const isAdminUser =
                user.walletAddress &&
                ADMIN_WALLETS.some((w) => w.toLowerCase() === String(user.walletAddress).toLowerCase());
            setCookies(this, user.id, isAdminUser ? "admin" : (user.type as any) || "normal");
            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name || "",
                    walletAddress: user.walletAddress,
                },
            };
        }

        if (existingWithEmail) {
            return {
                success: false,
                message:
                    "This email is already registered. Log in with email or use the wallet linked to that account.",
            };
        }

        const walletTaken = await db.select().from(users).where(eq(users.walletAddress, a)).get();
        if (walletTaken) {
            pendingMetamaskSignups.delete(a);
            return {
                success: false,
                message: "This wallet is already registered. Reload the page and sign in again.",
            };
        }

        const result = await db
            .insert(users)
            .values({
                email: emailNorm,
                name: emailNorm.split("@")[0],
                walletAddress: a,
                authProvider: "metamask",
                type: "normal",
            })
            .returning()
            .get();

        pendingMetamaskSignups.delete(a);

        const isAdminUser =
            result.walletAddress &&
            ADMIN_WALLETS.some((w) => w.toLowerCase() === String(result.walletAddress).toLowerCase());
        setCookies(this, result.id, isAdminUser ? "admin" : "normal");

        return {
            success: true,
            user: {
                id: result.id,
                email: result.email,
                name: result.name || "",
                walletAddress: result.walletAddress,
            },
        };
    } catch (err: any) {
        console.error("completeMetamaskSignup error:", err);
        const hint = migrateHintMessage(err);
        return { success: false, message: hint || "Could not save your email." };
    }
});

/**
 * Export Private Key - Requires password verification
 * This action decrypts and returns the user's private key after verifying their password.
 * SECURITY: Only call this when the user explicitly requests to export their key.
 */
export const exportPrivateKey = server$(async function (data: { walletAddress: string, password: string }): Promise<ExportKeyResult> {
    const { walletAddress, password } = data;

    if (!walletAddress || !password) {
        return { success: false, message: "Wallet address and password are required" };
    }

    try {
        const db = await loadTursoDb();
        // 1. Find user by wallet address
        const user = await db
            .select()
            .from(users)
            .where(eq(users.walletAddress, walletAddress.toLowerCase() as `0x${string}`))
            .get();

        if (!user || !user.password || !user.encryptedPrivateKey || !user.iv) {
            return { success: false, message: "No managed wallet found for this address" };
        }

        // 2. Verify Password
        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            return { success: false, message: "Invalid password" };
        }

        // 3. Decrypt Private Key
        const privateKey = decrypt(user.encryptedPrivateKey, user.iv);

        return {
            success: true,
            privateKey
        };

    } catch (err: any) {
        console.error('Export private key error:', err);
        const hint = migrateHintMessage(err);
        return { success: false, message: hint || 'Failed to export private key' };
    }
});

/**
 * Sign and Send Transaction for Managed Wallets
 * This action allows managed wallets to sign and send transactions without exposing the private key to the client.
 * The private key is decrypted server-side, transaction is signed, and sent to the network.
 */
export interface SignTransactionParams {
    walletAddress: string;
    to: string;
    data: string;
    value?: string;
    gas?: string;
}

export interface SignTransactionResult {
    success: boolean;
    message?: string;
    txHash?: string;
}

export const signManagedTransaction = server$(async function (params: SignTransactionParams): Promise<SignTransactionResult> {
    const { walletAddress, to, data, value, gas } = params;

    if (!walletAddress || !to) {
        return { success: false, message: "Missing required parameters" };
    }

    try {
        const db = await loadTursoDb();
        // 1. Find user by wallet address
        const user = await db
            .select()
            .from(users)
            .where(eq(users.walletAddress, walletAddress.toLowerCase() as `0x${string}`))
            .get();

        if (!user || !user.encryptedPrivateKey || !user.iv) {
            return { success: false, message: "No managed wallet found for this address" };
        }

        // 2. Decrypt Private Key
        const privateKey = decrypt(user.encryptedPrivateKey, user.iv);

        // 3. Create account from private key
        const account = privateKeyToAccount(privateKey as `0x${string}`);

        // 4. Create wallet client and send transaction
        const { createWalletClient, createPublicClient, http } = await import('viem');
        const { base, baseSepolia } = await import('viem/chains');

        // Get the correct chain based on environment
        const isMainnet = import.meta.env.PUBLIC_CHAIN_ID === '8453';
        const chain = isMainnet ? base : baseSepolia;
        const rpcUrl = import.meta.env.PUBLIC_RPC_URL || 'https://site1.moralis-nodes.com/base/f6a854a1cb834f1fa4b7e59ea18754f1';

        const publicClient = createPublicClient({
            chain,
            transport: http(rpcUrl)
        });

        const walletClient = createWalletClient({
            account,
            chain,
            transport: http(rpcUrl)
        });

        // 5. Get gas estimate if not provided
        let gasLimit = gas ? BigInt(gas) : undefined;
        if (!gasLimit) {
            try {
                gasLimit = await publicClient.estimateGas({
                    account: account.address,
                    to: to as `0x${string}`,
                    data: data as `0x${string}`,
                    value: value ? BigInt(value) : undefined,
                });
                // Add 20% buffer
                gasLimit = (gasLimit * 120n) / 100n;
            } catch (estimateError) {
                console.warn('Gas estimation failed, using default:', estimateError);
                gasLimit = 500000n;
            }
        }

        // 6. Send transaction
        const hash = await walletClient.sendTransaction({
            to: to as `0x${string}`,
            data: data as `0x${string}`,
            value: value ? BigInt(value) : 0n,
            gas: gasLimit,
        });

        console.log('[ManagedWallet] Transaction sent:', hash);

        return {
            success: true,
            txHash: hash
        };

    } catch (err: any) {
        console.error('Sign managed transaction error:', err);
        const hint = migrateHintMessage(err);
        return {
            success: false,
            message: hint || err.message || 'Failed to sign and send transaction',
        };
    }
});
