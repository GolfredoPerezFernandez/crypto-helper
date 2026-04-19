import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// Ensure you have ENCRYPTION_KEY in your .env file
// It must be 32 characters long for aes-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: ENCRYPTION_KEY is missing in production environment');
}

// Fallback for dev only if key is missing (DO NOT USE IN PROD)
const getKey = () => {
    if (ENCRYPTION_KEY) {
        // Hash the provided key to ensure it's 32 bytes
        return createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    }
    // Dev fallback
    console.warn('Using dev fallback key for encryption. Set ENCRYPTION_KEY in .env!');
    return Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');
};

export const encrypt = (text: string) => {
    const iv = randomBytes(16);
    const key = getKey();
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return {
        iv: iv.toString('hex'),
        // Storing authTag appended to ensure we have it
        content: encrypted + ':' + authTag
    };
};

export const decrypt = (encryptedContent: string, ivHex: string) => {
    const [encrypted, authTag] = encryptedContent.split(':');
    if (!encrypted || !authTag) {
        throw new Error('Invalid encrypted content format');
    }

    const key = getKey();
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};
