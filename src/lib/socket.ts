// src/lib/socket.ts
import { io, Socket as SocketIOClient } from 'socket.io-client';

let socket: SocketIOClient | null = null;

/**
 * Initialize Socket.io connection for real-time bill updates
 */
export const initSocket = (billId: string): SocketIOClient => {
    if (socket?.connected) {
        socket.emit('join-bill', billId);
        return socket;
    }

    const socketUrl = process.env.SOCKET_URL || process.env.REACT_APP_WS_URL || 'http://localhost:5000';

    socket = io(socketUrl, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
        console.log(`[Socket] Connected successfully | Joining bill: ${billId}`);
        socket?.emit('join-bill', billId);
    });

    socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
    });

    return socket;
};

/**
 * Disconnect socket when user leaves the bill page
 */
export const disconnectSocket = (): void => {
    socket?.disconnect();
    socket = null;
};

/**
 * Get current socket instance if needed elsewhere
 */
export const getCurrentSocket = (): SocketIOClient | null => socket;