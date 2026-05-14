// src/lib/amwal.ts
export const loadSmartBoxScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.SmartBox) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.amwalpg.com/js/SmartBox.js?v=1.1'; // Production URL
        // script.src = 'https://test.amwalpg.com:19443/js/SmartBox.js?v=1.1'; // Test URL

        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load SmartBox.js'));

        document.head.appendChild(script);
    });
};