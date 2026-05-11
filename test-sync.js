// test-sync.js
const { loyverseService } = require('./src/services/loyverse.service.js');

async function testDatabaseSync() {
    console.log("Starting Full Loyverse → Supabase Sync Test...\n");

    try {
        const result = await loyverseService.syncMenu();

        console.log("\n === SYNC SUMMARY ===");
        console.log(`Success: ${result.success}`);
        console.log(`Items synced: ${result.itemsCount}`);
        console.log(`Categories synced: ${result.categoriesCount}`);
        console.log(`Synced at: ${result.syncedAt}`);

        console.log("\nCheck your Supabase dashboard to verify the data!");

    } catch (error) {
        console.error("Sync test failed:", error.message);
    }
}

testDatabaseSync();