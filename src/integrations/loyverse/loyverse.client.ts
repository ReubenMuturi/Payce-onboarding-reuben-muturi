// src/integrations/loyverse/loyverse.client.ts
import { LoyverseItem, LoyverseCategory } from './loyverse.types';

const BASE_URL = 'https://api.loyverse.com/v1.0';

export class LoyverseClient {
    private readonly accessToken: string;

    constructor() {
        this.accessToken = process.env.LOYVERSE_ACCESS_TOKEN || '';
        if (!this.accessToken) {
            throw new Error('LOYVERSE_ACCESS_TOKEN is missing in environment variables');
        }
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${BASE_URL}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Loyverse API Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        return response.json();
    }

    async getItems(cursor?: string, limit = 250): Promise<{ items: LoyverseItem[]; cursor?: string }> {
        const query = new URLSearchParams({
            limit: limit.toString(),
            ...(cursor && { cursor }),
        });

        return this.request(`/items?${query}`);
    }

    async getCategories(cursor?: string, limit = 100): Promise<{ categories: LoyverseCategory[]; cursor?: string }> {
        const query = new URLSearchParams({
            limit: limit.toString(),
            ...(cursor && { cursor }),
        });

        return this.request(`/categories?${query}`);
    }
}