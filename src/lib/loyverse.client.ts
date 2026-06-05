import dotenv from 'dotenv';
import {
    LoyverseItemsResponseSchema,
    LoyverseCategoriesResponseSchema,
    LoyverseItemSingleResponseSchema,
    LoyverseCategorySingleResponseSchema
} from '../types/loyverse.schemas';
import { LoyverseItemApi, LoyverseCategoryApi } from '../types/loyverse.types';
import { loyverseConfig } from '../config/loyverse';

dotenv.config();

export class LoyverseClient {
    private baseUrl: string = loyverseConfig.apiBaseUrl;

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
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                },
            });

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

                console.warn(`[LoyverseClient] Rate limited (429). Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`);
                await this.sleep(delay);
                continue;
            }

            // Handle Transient Errors (5xx)
            if (response.status >= 500) {
                const delay = (baseDelay * Math.pow(2, attempt - 1)) + Math.random() * 100;
                console.warn(`[LoyverseClient] Server error (${response.status}). Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`);
                await this.sleep(delay);
                continue;
            }

            // Non-retryable errors (4xx except 429)
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Loyverse API Error (${response.status}): ${JSON.stringify(errorData)}`);
        }
    }

    async getAllItems(apiToken: string, updatedAt?: string): Promise<LoyverseItemApi[]> {
        let allItems: LoyverseItemApi[] = [];
        let cursor: string | null | undefined = undefined;
        let pageCount = 0;

        do {
            pageCount++;
            if (pageCount > loyverseConfig.maxPages) {
                console.warn(`[LoyverseClient] Max page limit reached (${loyverseConfig.maxPages}). Some items may be missing.`);
                break;
            }

            const queryParams = new URLSearchParams({ limit: '200' });
            if (updatedAt) {
                queryParams.append('updated_at', updatedAt);
            }

            const rawData = await this.request<any>(`/items?${queryParams.toString()}`, apiToken, cursor);

            const result = LoyverseItemsResponseSchema.safeParse(rawData);
            if (!result.success) {
                console.error(`[LoyverseClient] API Contract Violation in /items:`, result.error.format());
                throw new Error(`Loyverse API response failed validation: ${result.error.message}`);
            }

            if (result.data.items && result.data.items.length > 0) {
                allItems.push(...result.data.items);
            }

            cursor = result.data.cursor;
        } while (cursor);

        return allItems;
    }

    async getCategories(apiToken: string, updatedAt?: string): Promise<LoyverseCategoryApi[]> {
        let allCategories: LoyverseCategoryApi[] = [];
        let cursor: string | null | undefined = undefined;
        let pageCount = 0;

        do {
            pageCount++;
            if (pageCount > loyverseConfig.maxPages) {
                console.warn(`[LoyverseClient] Max page limit reached (${loyverseConfig.maxPages}). Some categories may be missing.`);
                break;
            }

            const queryParams = new URLSearchParams({ limit: '100' });
            if (updatedAt) {
                queryParams.append('updated_at', updatedAt);
            }

            const rawData = await this.request<any>(`/categories?${queryParams.toString()}`, apiToken, cursor);

            const result = LoyverseCategoriesResponseSchema.safeParse(rawData);
            if (!result.success) {
                console.error(`[LoyverseClient] API Contract Violation in /categories:`, result.error.format());
                throw new Error(`Loyverse API response failed validation: ${result.error.message}`);
            }

            if (result.data.categories && result.data.categories.length > 0) {
                allCategories.push(...result.data.categories);
            }

            cursor = result.data.cursor;
        } while (cursor);

        return allCategories;
    }

    async getItem(apiToken: string, itemId: string): Promise<LoyverseItemApi> {
        const rawData = await this.request<any>(`/items/${itemId}`, apiToken);
        const result = LoyverseItemSingleResponseSchema.safeParse(rawData);

        if (!result.success) {
            console.error(`[LoyverseClient] API Contract Violation in /items/${itemId}:`, result.error.format());
            throw new Error(`Loyverse API response failed validation: ${result.error.message}`);
        }

        return result.data;
    }

    async getCategory(apiToken: string, categoryId: string): Promise<LoyverseCategoryApi> {
        const rawData = await this.request<any>(`/categories/${categoryId}`, apiToken);
        const result = LoyverseCategorySingleResponseSchema.safeParse(rawData);

        if (!result.success) {
            console.error(`[LoyverseClient] API Contract Violation in /categories/${categoryId}:`, result.error.format());
            throw new Error(`Loyverse API response failed validation: ${result.error.message}`);
        }

        return result.data;
    }
}
