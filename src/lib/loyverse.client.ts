import dotenv from 'dotenv';
import {
    LoyverseItemsResponseSchema,
    LoyverseCategoriesResponseSchema,
    LoyverseItemSingleResponseSchema,
    LoyverseCategorySingleResponseSchema
} from '../types/loyverse.schemas';
import { LoyverseItemApi, LoyverseCategoryApi } from '../types/loyverse.types';

dotenv.config();

const BASE_URL = 'https://api.loyverse.com/v1.0';

export class LoyverseClient {
    private baseUrl: string = BASE_URL;
    private MAX_PAGES = 50; // Safety circuit breaker to prevent infinite loops

    /**
     * Core request handler
     * Now supports optional cursor for pagination
     */
    private async request<T>(endpoint: string, apiToken: string, cursor?: string | null): Promise<T> {
        const url = new URL(`${this.baseUrl}${endpoint}`);

        if (cursor) {
            url.searchParams.append('cursor', cursor);
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Loyverse API Error (${response.status}): ${JSON.stringify(errorData)}`);
        }

        return response.json();
    }

    async getAllItems(apiToken: string): Promise<LoyverseItemApi[]> {
        let allItems: LoyverseItemApi[] = [];
        let cursor: string | null | undefined = undefined;
        let pageCount = 0;

        do {
            pageCount++;
            if (pageCount > this.MAX_PAGES) {
                console.warn(`[LoyverseClient] Max page limit reached (${this.MAX_PAGES}). Some items may be missing.`);
                break;
            }

            const rawData = await this.request<any>('/items?limit=200', apiToken, cursor);

            // RUNTIME VALIDATION: Ensure the API response matches our contract
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

    async getCategories(apiToken: string): Promise<LoyverseCategoryApi[]> {
        let allCategories: LoyverseCategoryApi[] = [];
        let cursor: string | null | undefined = undefined;
        let pageCount = 0;

        do {
            pageCount++;
            if (pageCount > this.MAX_PAGES) {
                console.warn(`[LoyverseClient] Max page limit reached (${this.MAX_PAGES}). Some categories may be missing.`);
                break;
            }

            const rawData = await this.request<any>('/categories?limit=100', apiToken, cursor);

            // RUNTIME VALIDATION: Ensure the API response matches our contract
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