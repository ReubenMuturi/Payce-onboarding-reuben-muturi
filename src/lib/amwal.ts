// src/lib/amwal.ts
import amwalConfig from '../config/amwal.config';

const SMARTBOX_SCRIPT_URL = `${amwalConfig.baseUrl}/js/SmartBox.js?v=1.1`;

/**
 * Dynamically loads the Amwal SmartBox script
 * Used for hosted payment fields / checkout
 */
export const loadSmartBoxScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Prevent duplicate loading
        if ((window as any).SmartBox) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = SMARTBOX_SCRIPT_URL;
        script.async = true;
        script.crossOrigin = 'anonymous';

        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load Amwal SmartBox from ${SMARTBOX_SCRIPT_URL}`));

        document.head.appendChild(script);
    });
};

// Optional: Check if script is already loaded
export const isSmartBoxLoaded = (): boolean => {
    return !!(window as any).SmartBox;
};