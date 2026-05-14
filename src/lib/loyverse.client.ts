import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://api.loyverse.com/v1.0';
const ACCESS_TOKEN = process.env.LOYVERSE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
    console.error('CRITICAL ERROR: LOYVERSE_ACCESS_TOKEN is missing in .env file');
    process.exit(1);
}

export class LoyverseClient {
    private headers: HeadersInit;

    constructor() {
        this.headers = {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        };
    }

    private async request<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: this.headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Loyverse API Error (${response.status}): ${JSON.stringify(errorData)}`);
        }

        return response.json();
    }

    async getAllItems(): Promise<any[]> {
        const data = await this.request<{ items: any[] }>('/items?limit=200');
        return data.items || [];
    }

    async getCategories(): Promise<any[]> {
        const data = await this.request<{ categories: any[] }>('/categories?limit=100');
        return data.categories || [];
    }
}