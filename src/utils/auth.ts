import { RequestEvent, RequestEventBase } from '@builder.io/qwik-city';

// Convert string to ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBufferLike {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

// Convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBufferLike): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const authVerbose = () => process.env.NODE_ENV !== 'production';

export async function hashPassword(password: string): Promise<string> {
  if (authVerbose()) console.log('[AUTH] Hashing password');

  // Convert password to ArrayBuffer
  const passwordBuffer = stringToArrayBuffer(password);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Import password as key
  const key = await crypto.subtle.importKey(
    'raw',
    passwordBuffer as ArrayBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive key using PBKDF2
  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  );

  // Combine salt and derived key
  const combined = new Uint8Array(salt.length + 32);
  combined.set(salt);
  combined.set(new Uint8Array(derivedKey), salt.length);

  // Return as hex string
  const hash = arrayBufferToHex(combined.buffer);
  if (authVerbose()) console.log('[AUTH] Password hashed successfully');
  return hash;
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (authVerbose()) console.log('[AUTH] Verifying password');

  // Convert hex string back to ArrayBuffer
  const combined = new Uint8Array(hash.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  // Extract salt and derived key
  const salt = combined.slice(0, 16);
  const storedKey = combined.slice(16);

  // Hash the input password with the same salt
  const passwordBuffer = stringToArrayBuffer(password);
  const key = await crypto.subtle.importKey(
    'raw',
    passwordBuffer as ArrayBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  );

  // Compare the derived key with the stored key
  // derivedKey is an ArrayBuffer, storedKey is Uint8Array
  const derivedKeyHex = arrayBufferToHex(derivedKey);
  const storedKeyHex = arrayBufferToHex(storedKey.buffer);
  const isValid = derivedKeyHex === storedKeyHex;
  if (authVerbose()) console.log(`[AUTH] Password verification result: ${isValid}`);
  return isValid;
}

// Helper functions for cookies
export const setCookies = (
  requestEvent: RequestEventBase,
  userId: string | number | bigint,
  userType: 'admin' | 'coordinator' | 'normal'
) => {
  const userIdStr = String(userId);

  // Set longer session duration (24 hours in seconds)
  const maxAge = 24 * 60 * 60;

  // Set auth token cookie - same-site lax to prevent issues with redirects
  requestEvent.cookie.set('auth_token', userIdStr, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax', // Changed from 'strict' to 'lax' for better session persistence
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAge,
  });

  // Set user type cookie - same settings for consistency
  requestEvent.cookie.set('user_type', userType, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax', // Changed from 'strict' to 'lax'
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAge,
  });

  // Add a client-readable session cookie for UI indication
  requestEvent.cookie.set('session_active', 'true', {
    path: '/',
    httpOnly: false, // Client can read this
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAge,
  });
};

export const clearAuthCookies = (requestEvent: RequestEventBase) => {
  requestEvent.cookie.delete('auth_token', { path: '/' });
  requestEvent.cookie.delete('user_type', { path: '/' });
  requestEvent.cookie.delete('session_active', { path: '/' });
};

export const getUserId = (requestEvent: RequestEventBase): string | null => {
  const user_id = requestEvent.cookie.get('auth_token')?.value;
  return user_id || null;
};

export const getUserType = (requestEvent: RequestEventBase): 'admin' | 'coordinator' | 'normal' => {
  const user_type = requestEvent.cookie.get('user_type')?.value;
  if (user_type === 'admin') return 'admin';
  if (user_type === 'coordinator') return 'coordinator';
  return 'normal';
};

export const isAdmin = (requestEvent: RequestEventBase): boolean => {
  return getUserType(requestEvent) === 'admin';
};

export const isCoordinator = (requestEvent: RequestEventBase): boolean => {
  return getUserType(requestEvent) === 'coordinator';
};

export const verifyAuth = async (requestEvent: RequestEventBase): Promise<boolean> => {
  // console.log('[AUTH] Verifying authentication');
  const user_id = requestEvent.cookie.get('auth_token')?.value;
  // console.log(`[AUTH] Found auth_token: ${user_id ? 'yes' : 'no'}`);

  if (!user_id) {
    // console.log('[AUTH] No auth_token found - user not authenticated');
    return false;
  }

  // Removed automatic cookie refresh on verification.
  // Cookies will rely on their maxAge set during login.
  // If session extension is needed later, a more robust mechanism
  // (e.g., checking expiry time) should be implemented.

  if (authVerbose()) console.log('[AUTH] User authenticated successfully');
  return true;
};
