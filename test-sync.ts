import { loyverseService } from './src/services/loyverse.service';
import { loyverseWebhookService } from './src/services/loyverse-webhook.service';
import { loyverseDebounceProcessor } from './src/jobs/loyverseDebounceProcessor.job';
import { loyverseSyncJob } from './src/jobs/loyverseSync.job';
import { supabase } from './src/config/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * LOYVERSE INTEGRATION TEST SUITE
 * This script simulates the behavior of the Loyverse API and Webhooks
 * to verify that the backend architecture is working without needing a live tunnel.
 */

async function getActiveMerchants() {
    console.log(' Looking for active test merchants in database...');
    const { data, error } = await supabase
        .from('merchants')
        .select('id, name')
        .eq('status', 'Active');

    if (error || !data || data.length === 0) {
        throw new Error('No active merchants found. Please create one in Supabase first.');
    }

    console.log(`Found ${data.length} active merchant(s).`);
    return data;
}

async function runFullSyncTest(merchantId: string, merchantName: string) {
    console.log(`\n--- Testing FULL MENU SYNC for ${merchantName} ---`);
    try {
        const result = await loyverseService.syncMenu(merchantId);
        console.log('Full Sync Success!');
        console.log(`Result: ${result.itemsCount} items and ${result.categoriesCount} categories synced.`);
    } catch (error: any) {
        console.error('Full Sync Failed:', error.message);
    }
}

async function runTargetedSyncTest(merchantId: string, merchantName: string) {
    console.log(`\n--- Testing TARGETED SYNC (FK Race Condition Fix) for ${merchantName} ---`);
    try {
        const { data: items } = await supabase
            .from('loyverse_items')
            .select('id')
            .eq('merchant_id', merchantId)
            .limit(1);

        const itemId = items && items.length > 0 ? items[0].id : uuidv4();

        console.log(`Simulating targeted sync for item: ${itemId}`);
        await loyverseService.syncSingleItem(merchantId, itemId);

        console.log('Targeted Sync processed without crashing.');
    } catch (error: any) {
        console.error('Targeted Sync Test Failed:', error.message);
    }
}

async function runWebhookSimulation(merchantId: string, merchantName: string) {
    console.log(`\n--- ⚡ Testing WEBHOOK LIVE UPDATES for ${merchantName} ---`);

    // Start the processor because it's not running in this standalone script
    // Note: We only call start() once in main(), not per merchant
    const mockItems = Array.from({ length: 12 }, () => uuidv4());

    console.log(`Simulating burst of ${mockItems.length} item updates with valid UUIDs...`);

    for (const id of mockItems) {
        await loyverseWebhookService.handleWebhook({
            event_type: 'item.updated',
            resource_id: id
        }, merchantId);
    }

    console.log(' All mock events sent to buffer.');

    const waitTime = 10000;
    console.log(`Waiting ${waitTime/1000} seconds for debounce window to expire...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    const { data, error } = await supabase
        .from('loyverse_webhook_debounce')
        .select('id')
        .eq('merchant_id', merchantId);

    if (error || (data && data.length > 0)) {
        console.error(' Debounce window failed: Items still remain in the queue.');
    } else {
        console.log(' Success: Debounce window passed and queue was processed.');
    }
}

async function main() {
    try {
        const merchants = await getActiveMerchants();

        // Start the processor once for the entire test run
        console.log('Starting Debounce Processor for simulation...');
        loyverseDebounceProcessor.start();

        for (const merchant of merchants) {
            console.log(`\n==================================================`);
            console.log(` STARTING TESTS FOR: ${merchant.name} (${merchant.id})`);
            console.log(`==================================================`);

            // Test 1: Full Sync
            await runFullSyncTest(merchant.id, merchant.name);

            // Test 2: Targeted Sync / FK Fix
            await runTargetedSyncTest(merchant.id, merchant.name);

            // Test 3: Live Webhooks
            await runWebhookSimulation(merchant.id, merchant.name);
        }

        console.log('\n==================================================');
        console.log(' All Loyverse integration tests completed for all merchants!');
        console.log('==================================================');
    } catch (error: any) {
        console.error('\n CRITICAL TEST FAILURE:', error.message);
        process.exit(1);
    }
}

main();
