import dotenv from 'dotenv';
import CircuitBreaker from 'opossum';
import {
    LoyverseItemsResponseSchema,
    LoyverseCategoriesResponseSchema,
    LoyverseItemSingleResponseSchema,
    LoyverseCategorySingleResponseSchema
} from '../types/loyverse.schemas';
import { LoyverseItemApi, LoyverseCategoryApi } from '../types/loyverse.types';
import { loyverseConfig } from '../config/loyverse';
import { logger } from '../lib/logger';

dotenv.config();

export class LoyverseClient {
    private baseUrl: string = loyverseConfig.apiBaseUrl;
    private breaker: CircuitBreaker<[options: { url: string; apiToken: string }], Response>;

    constructor() {
        this.breaker = new CircuitBreaker(this.executeRequest.bind(this), {
            timeout: 30000, // 30s
            errorThresholdPercentage: 50,
            resetTimeout: 30000 // 30s
        });

        this.breaker.on('open', () => logger.warn('[LoyverseClient] Circuit Breaker OPEN - failing fast'));
        this.breaker.on('halfOpen', () => logger.info('[LoyverseClient] Circuit Breaker HALF-OPEN - testing recovery'));
        this.breaker.on('close', () => logger.info('[LoyverseClient] Circuit Breaker CLOSED - recovered'));
    }

    /**
     * The actual fetch operation wrapped by the Circuit Breaker.
     */
    private async executeRequest(options: { url: string, apiToken: string }): Promise<Response> {
        return fetch(options.url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${options.apiToken}`,
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Helper to sleep for a given duration
     */
    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Core request handler with exponential back-off and rate-limit handling.
     */
    private async request<T>(endpoint: string, apiToken: string, cursor?: string | null): Promise<T> {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        if (cursor) {
            url.searchParams.append('cursor', cursor);
        }

        let attempt = 0;
        const maxAttempts = loyverseConfig.maxRetryAttempts;
        const baseDelay = loyverseConfig.retryBaseMs;

        while (true) {
            attempt++;
            const response = await this.breaker.fire({ url: url.toString(), apiToken });

            if (response.ok) {
                return response.json();
            }

            if (attempt >= maxAttempts) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Loyverse API Error (${response.status}) after ${maxAttempts} attempts: ${JSON.stringify(errorData)}`);
            }

            // Handle Rate Limiting (429)
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const delay = retryAfter
                    ? parseInt(retryAfter, 10) * 1000
                    : (baseDelay * Math.pow(2, attempt - 1)) + Math.random() * 100;

                logger.warn({ delay, attempt, maxAttempts }, `[LoyverseClient] Rate limited (429). Retrying...`);
                await this.sleep(delay);
                continue;
            }

            // Handle Transient Errors (5xx)
            if (response.status >= 500) {
                const delay = (baseDelay * Math.pow(2, attempt - 1)) + Math.random() * 100;
                logger.warn({ status: response.status, delay, attempt, maxAttempts }, `[LoyverseClient] Server error. Retrying...`);
                await this.sleep(delay);
                continue;
            }

            // Non-retryable errors (4xx except 429)
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Loyverse API Error (${response.status}): ${JSON.stringify(errorData)}`);
        }
    }

    /**
     * Fetches all items for a merchant from Loyverse API.
     * Supports pagination and differential sync via updatedAt filter.
     *
     * @param apiToken Merchant's Loyverse API token
     * @param updatedAt Optional timestamp to fetch only updated items
     * @returns A promise resolving to an array of Loyverse items
     * @throws Error if API validation fails or max page limit is reached
     */
    async getAllItems(apiToken: string, updatedAt?: string): Promise<LoyverseItemApi[]> {
        let allItems: LoyverseItemApi[] = [];
        let cursor: string | null | undefined = undefined;
        let pageCount = 0;

        do {
            pageCount++;
            if (pageCount > loyverseConfig.maxPages) {
                logger.warn({ maxPages: loyverseConfig.maxPages }, `[LoyverseClient] Max page limit reached. Some items may be missing.`);
                break;
            }

            const queryParams = new URLSearchParams({ limit: '200' });
            if (updatedAt) {
                queryParams.append('updated_at', updatedAt);
            }

            const rawData = await this.request<any>(`/items?${queryParams.toString()}`, apiToken, cursor);

            const result = LoyverseItemsResponseSchema.safeParse(rawData);
            if (!result.success) {
                logger.error({ error: result.error.format() }, `[LoyverseClient] API Contract Violation in /items`);
                throw new Error(`Loyverse API response failed validation: ${result.error.message}`);
            }

            if (result.data.items && result.data.items.length > 0) {
                allItems.push(...result.data.items);
            }

            cursor = result.data.cursor;
        } while (cursor);

        return allItems;
    }

    /**
     * Fetches all categories for a merchant from Loyverse API.
     * Supports pagination and differential sync via updatedAt filter.
     *
     * @param apiToken Merchant's Loyverse API token
     * @param updatedAt Optional timestamp to fetch only updated categories
     * @returns A promise resolving to an array of Loyverse categories
     * @throws Error if API validation fails or max page limit is reached
     */
    async getCategories(apiToken: string, updatedAt?: string): Promise<LoyverseCategoryApi[]> {
        let allCategories: LoyverseCategoryApi[] = [];
        let cursor: string | null | undefined = undefined;
        let pageCount = 0;

        do {
            pageCount++;
            if (pageCount > loyverseConfig.maxPages) {
                logger.warn({ maxPages: loyverseConfig.maxPages }, `[LoyverseClient] Max page limit reached. Some categories may be missing.`);
                break;
            }

            const queryParams = new URLSearchParams({ limit: '100' });
            if (updatedAt) {
                queryParams.append('updated_at', updatedAt);
            }

            const rawData = await this.request<any>(`/categories?${queryParams.toString()}`, apiToken, cursor);

            const result = LoyverseCategoriesResponseSchema.safeParse(rawData);
            if (!result.success) {
                logger.error({ error: result.error.format() }, `[LoyverseClient] API Contract Violation in /categories`);
                throw new Error(`Loyverse API response failed validation: ${result.error.message}`);
            }

            if (result.data.categories && result.data.categories.length > 0) {
                allCategories.push(...result.data.categories);
            }

            cursor = result.data.cursor;
        } while (cursor);

        return allCategories;
    }

    /**
     * Fetches a single item by its ID.
     *
     * @param apiToken Merchant's Loyverse API token
     * @param itemId The Loyverse item ID
     * @returns A promise resolving to the Loyverse item data
     * @throws Error if API validation fails
     */
    async getItem(apiToken: string, itemId: string): Promise<LoyverseItemApi> {
        const rawData = await this.request<any>(`/items/${itemId}`, apiToken);
        const result = LoyverseItemSingleResponseSchema.safeParse(rawData);

        if (!result.success) {
            logger.error({ itemId, error: result.error.format() }, `[LoyverseClient] API Contract Violation in /items/${itemId}`);
            throw new Error(`Loyverse API response failed validation: ${result.error.message}`);
        }

        return result.data;
    }

    /**
     * Fetches a single category by its ID.
     *
     * @param apiToken Merchant's Loyverse API token
     * @param categoryId The Loyverse category ID
     * @returns A promise resolving to the Loyverse category data
     * @throws Error if API validation fails
     */
    async getCategory(apiToken: string, categoryId: string): Promise<LoyverseCategoryApi> {
        const rawData = await this.request<any>(`/categories/${categoryId}`, apiToken);
        const result = LoyverseCategorySingleResponseSchema.safeParse(rawData);

        if (!result.success) {
            logger.error({ categoryId, error: result.error.format() }, `[LoyverseClient] API Contract Violation in /categories/${categoryId}`);
            throw new Error(`Loyverse API response failed validation: ${result.error.message}`);
        }

        return result.data;
    }
}
