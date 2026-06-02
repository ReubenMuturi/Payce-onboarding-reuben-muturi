// src/middleware/requestId.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to assign a unique Request ID (Correlation ID) to every incoming request.
 * This ID is used across all logs to trace a single request's lifecycle through the system.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // Use existing ID from gateway/frontend or generate a new one
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    // Attach to request object for use in controllers/services
    (req as any).requestId = requestId;

    // Return the ID in the response header for debugging
    res.setHeader('x-request-id', requestId);

    next();
};
