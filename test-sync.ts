import { loyverseService } from './src/services/loyverse.service';
import { loyverseWebhookService } from './src/services/loyverse-webhook.service';
import { supabase } from './src/config/supabase';

/**
 * LOYVERSE INTEGRATION TEST SUITE
 * This script simulates the behavior of the Loyverse API and Webhooks
 * to verify that the backend architecture is working without needing a live tunnel.
 */

async function getTestMerchant() {
    console.log(' Looking for an active test merchant in database...');
    const { data, error } = await supabase
        .from('merchants')
        .select('id, name')
        .eq('status', 'Active')
        .single();

    if (error || !data) {
        throw new Error('No active merchant found. Please create one in Supabase first.');
    }
    console.log(`Using Merchant: ${data.name} (${data.id})`);
    return data.id;
}

async function runFullSyncTest(merchantId: string) {
    console.log('\n--- Testing FULL MENU SYNC ---');
    try {
        const result = await loyverseService.syncMenu(merchantId);
        console.log('Full Sync Success!');
        console.log(`Result: ${result.itemsCount} items and ${result.categoriesCount} categories synced.`);
    } catch (error: any) {
        console.error('Full Sync Failed:', error.message);
    }
}

async function runWebhookSimulation(merchantId: string) {
    console.log('\n--- ⚡ Testing WEBHOOK LIVE UPDATES ---');

    // We will simulate a burst of 12 updates to trigger the "Full Sync" logic in the debounce service
    const mockItems = Array.from({ length: 12 }, (_, i) => `item_uuid_${i}`);

    console.log(`Simulating burst of ${mockItems.length} item updates...`);

    for (const id of mockItems) {
        await loyverseWebhookService.handleWebhook({
            event_type: 'item.updated',
            resource_id: id
        }, merchantId);
    }

    console.log(' All mock events sent to buffer.');
    console.log(' Waiting 6 seconds for debounce window to expire...');

    // Wait for the setTimeout(..., 5000) in the service to fire
    await new Promise(resolve => setTimeout(resolve, 6000));
    console.log(' Debounce window passed. Check logs for "Large burst detected" message.');
}

async function main() {
    try {
        const merchantId = await getTestMerchant();

        // Test 1: Full Sync
        await runFullSyncTest(merchantId);

        // Test 2: Live Webhooks
        await runWebhookSimulation(merchantId);

        console.log('\n==================================================');
        console.log(' All Loyverse integration tests completed!');
        console.log('Check your server logs to see the debounce logic in action.');
        console.log('==================================================');
    } catch (error: any) {
        console.error('\n CRITICAL TEST FAILURE:', error.message);
        process.exit(1);
    }
}

main();
