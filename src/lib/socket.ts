// src/lib/socket.ts
import { io, Socket as SocketIOClient } from 'socket.io-client';

let currentSocket: SocketIOClient | null = null;

/**
 * Initialize or reuse Socket.io connection for real-time bill updates
 */
export const initSocket = (billId: string): SocketIOClient => {
    // If socket exists and is connected, just join the new bill room
    if (currentSocket?.connected) {
        currentSocket.emit('join-bill', billId);
        return currentSocket;
    }

    const socketUrl = process.env.SOCKET_URL ||
        process.env.REACT_APP_WS_URL ||
        'http://localhost:5000';

    currentSocket = io(socketUrl, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        transports: ['websocket', 'polling'],
        autoConnect: true,
    });

    currentSocket.on('connect', () => {
        console.log(`[Socket] Connected | Joining bill: ${billId}`);
        currentSocket?.emit('join-bill', billId);
    });

    currentSocket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
    });

    currentSocket.on('disconnect', (reason) => {
        console.log(`[Socket] Disconnected. Reason: ${reason}`);
    });

    return currentSocket;
};

/**
 * Disconnect socket and clean up when component unmounts
 */
export const disconnectSocket = (): void => {
    if (currentSocket) {
        currentSocket.removeAllListeners();
        currentSocket.disconnect();
        currentSocket = null;
    }
};

/**
 * Get current socket instance (for advanced use cases)
 */
export const getCurrentSocket = (): SocketIOClient | null => currentSocket;

/**
 * Join a specific bill room (useful if socket is already connected)
 */
export const joinBillRoom = (billId: string): void => {
    currentSocket?.emit('join-bill', billId);
};