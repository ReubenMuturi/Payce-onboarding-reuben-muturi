// test-sync.js
// ================================================
// Test File - Loyverse to Supabase Sync
// ================================================
// Purpose: Quick way to test the full sync process without starting the server

const { loyverseService } = require('./src/services/loyverse.service');

async function testDatabaseSync() {
    console.log("Starting Full Loyverse → Supabase Sync Test...\n");

    try {
        const result = await loyverseService.syncMenu();

        console.log("\n=== SYNC SUMMARY ===");
        console.log(`Success: ${result.success}`);
        console.log(`Items synced: ${result.itemsCount || 0}`);
        console.log(`Categories synced: ${result.categoriesCount || 0}`);
        console.log(`Synced at: ${result.syncedAt}`);

        console.log("\nCheck your Supabase dashboard to verify the data has been saved!");

    } catch (error) {
        console.error("Sync test failed:", error.message);
    }
}

// Run the test
testDatabaseSync();