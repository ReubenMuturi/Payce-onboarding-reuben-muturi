import { loyverseService } from './src/services/loyverse.service';

async function testDatabaseSync() {
    console.log('Starting Full Loyverse → Supabase Sync Test...\n');

    try {
        const result = await loyverseService.syncMenu();

        console.log('\n=== SYNC SUMMARY ===');
        console.log(`Success: ${result.success}`);
        console.log(`Items synced: ${result.itemsCount}`);
        console.log(`Categories synced: ${result.categoriesCount}`);
        if (result.modifiersCount !== undefined) {
            console.log(`Modifiers synced: ${result.modifiersCount}`);
        }
        console.log(`Synced at: ${result.syncedAt}`);

        console.log('\nCheck your Supabase dashboard to verify the data has been saved.');
    } catch (error: any) {
        console.error('Sync test failed:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

// Run the test
testDatabaseSync();