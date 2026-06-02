// src/lib/logger.ts
import pino from 'pino';

/**
 * Structured Logger using Pino.
 * In production, this outputs JSON for easy ingestion by ELK/Datadog/Sentry.
 * In development, it uses pino-pretty for human-readability.
 */
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
});
