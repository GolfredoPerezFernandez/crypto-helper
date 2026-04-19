import { server$ } from '@builder.io/qwik-city';
import { clearAuthCookies } from '~/utils/auth';

/** Isolated from `auth-actions` so layout never pulls `~/lib/turso` into the client bundle. */
export const logoutUser = server$(async function (): Promise<{ success: boolean; message?: string }> {
    try {
        clearAuthCookies(this);
        return { success: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Logout failed';
        console.error('[AUTH] logoutUser:', err);
        return { success: false, message };
    }
});
