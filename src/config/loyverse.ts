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

  // API page sizes (number of records per request)
  apiPageSizeItems: parseInt(process.env.LOYVERSE_PAGE_SIZE_ITEMS ?? '200', 10),
  apiPageSizeCategories: parseInt(process.env.LOYVERSE_PAGE_SIZE_CATEGORIES ?? '100', 10),

  // Safety limit: maximum number of pages to fetch per resource type to prevent infinite loops
  maxPages: parseInt(process.env.LOYVERSE_MAX_PAGES ?? '500', 10),

  // Sync job concurrency: how many merchants to process in parallel
  syncConcurrency: parseInt(process.env.LOYVERSE_SYNC_CONCURRENCY ?? '5', 10),

  // Retry settings for Loyverse API calls
  maxRetryAttempts: parseInt(process.env.LOYVERSE_MAX_RETRY ?? '5', 10),
  retryBaseMs: parseInt(process.env.LOYVERSE_RETRY_BASE_MS ?? '500', 10),

  // Optional: Loyverse API base URL (if ever needs to change)
  apiBaseUrl: process.env.LOYVERSE_API_BASE_URL ?? 'https://api.loyverse.com/v1.0',
};