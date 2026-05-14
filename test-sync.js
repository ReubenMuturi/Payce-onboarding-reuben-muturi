// test-sync.js
// Purpose: Quick way to test the full sync process
// Import the new TypeScript service (using dynamic import because this is .js)
async function testDatabaseSync() {
    console.log("Starting Full Loyverse → Supabase Sync Test...\n");

    try {
        // Dynamic import for TypeScript module from JS file
        const { loyverseService } = await import('./src/integrations/loyverse/loyverse.service.js');

        console.log("Calling syncMenu()...");
        const result = await loyverseService.syncMenu();

        console.log("\n=== SYNC SUMMARY ===");
        console.log(`Success: ${result.success}`);
        console.log(`Items synced: ${result.itemsCount || 0}`);
        console.log(`Categories synced: ${result.categoriesCount || 0}`);
        console.log(`Synced at: ${result.syncedAt}`);

        if (result.message) {
            console.log(`Message: ${result.message}`);
        }

        console.log("\nCheck your Supabase dashboard to verify the data!");

    } catch (error) {
        console.error("Sync test failed:", error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    }
}

// Run the test
testDatabaseSync();