// src/lib/amwal.ts
import { amwalConfig } from '../config/amwal.config';

export class AmwalClient {
    /**
     * Loads the SmartBox script required for hosted payment fields / redirect.
     * Safe to call multiple times (idempotent).
     */
    static async loadSmartBoxScript(): Promise<void> {
        // Skip in server-side rendering
        if (typeof window === 'undefined') {
            throw new Error('SmartBox script can only be loaded in the browser environment');
        }

        // Return early if already loaded
        if ((window as any).SmartBox) {
            return;
        }

        return new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = amwalConfig.smartboxUrl;
            script.async = true;
            script.defer = true;

            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load SmartBox script from ${amwalConfig.smartboxUrl}`));

            document.head.appendChild(script);
        });
    }

    /**
     * Returns the appropriate base URL depending on sandbox/mock mode
     */
    static getBaseUrl(): string {
        return amwalConfig.baseUrl;
    }

    /**
     * Checks if we are operating in mock mode (for development/testing)
     */
    static isMockMode(): boolean {
        return amwalConfig.useMock;
    }

    /**
     * Checks if we are in sandbox environment
     */
    static isSandbox(): boolean {
        return amwalConfig.sandboxMode;
    }
}

// For backward compatibility (if needed elsewhere)
export const loadSmartBoxScript = AmwalClient.loadSmartBoxScript;