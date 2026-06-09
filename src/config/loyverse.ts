import { config } from 'dotenv';
config(); // Load environment variables from .env file

/**
 * Configuration for Loyverse integration.
 * All values are read from environment variables with sensible defaults.
 */
export const loyverseConfig = {
  // Debounce settings for webhook processing
  debounceMs: parseInt(process.env.LOYVERSE_DEBOUNCE_MS ?? '5000', 10),

  // Burst threshold: if more than this many resources change in a debounce window, trigger full sync
  burstThreshold: parseInt(process.env.LOYVERSE_BURST_THRESHOLD ?? '10', 10),

  // Debounce Processor check interval (cron): every N seconds
  debounceProcessorIntervalSeconds: parseInt(process.env.LOYVERSE_DEBOUNCE_PROCESSOR_SECONDS ?? '5', 10),

  // API page sizes (number of records per request)
  apiPageSizeItems: parseInt(process.env.LOYVERSE_PAGE_SIZE_ITEMS ?? '200', 10),
  apiPageSizeCategories: parseInt(process.env.LOYVERSE_PAGE_SIZE_CATEGORIES ?? '100', 10),

  // Safety limit: maximum number of pages to fetch per resource type to prevent infinite loops
  maxPages: parseInt(process.env.LOYVERSE_MAX_PAGES ?? '500', 10),

  // Sync job concurrency: how many merchants to process in parallel
  syncConcurrency: parseInt(process.env.LOYVERSE_SYNC_CONCURRENCY ?? '5', 10),

  // Database write concurrency: how many parallel upserts to run for a single merchant
  dbWriteConcurrency: parseInt(process.env.LOYVERSE_DB_WRITE_CONCURRENCY ?? '3', 10),

  // Database batch size: how many records to upsert in a single query
  dbBatchSize: parseInt(process.env.LOYVERSE_DB_BATCH_SIZE ?? '100', 10),

  // Full sync threshold: sync a menu fully if it hasn't been synced in this many hours
  fullSyncThresholdHours: parseInt(process.env.LOYVERSE_FULL_SYNC_THRESHOLD_HOURS ?? '24', 10),

  // Job check interval (cron): every N minutes
  jobCheckIntervalMinutes: parseInt(process.env.LOYVERSE_JOB_CHECK_MINUTES ?? '15', 10),

  // Adaptive priority thresholds (in minutes)
  priorityThresholds: {
    highPriorityRecentActivityMinutes: parseInt(process.env.LOYVERSE_HIGH_PRIORITY_MINS ?? '60', 10),
    highPrioritySyncGapMinutes: parseInt(process.env.LOYVERSE_HIGH_PRIORITY_GAP_MINS ?? '15', 10),
    standardPriorityGapMinutes: parseInt(process.env.LOYVERSE_STANDARD_PRIORITY_GAP_MINS ?? '120', 10),
    coldStorageGapMinutes: parseInt(process.env.LOYVERSE_COLD_STORAGE_GAP_MINS ?? '1440', 10),
  },

  // Retry settings for Loyverse API calls
  maxRetryAttempts: parseInt(process.env.LOYVERSE_MAX_RETRY ?? '5', 10),
  retryBaseMs: parseInt(process.env.LOYVERSE_RETRY_BASE_MS ?? '500', 10),

  // Optional: Loyverse API base URL (if ever needs to change)
  apiBaseUrl: process.env.LOYVERSE_API_BASE_URL ?? 'https://api.loyverse.com/v1.0',
};