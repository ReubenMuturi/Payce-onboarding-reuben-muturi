// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (billId: string): Socket => {
    if (!socket) {
        socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000', {
            reconnection: true,
            reconnectionAttempts: 5,
        });
    }

    socket.emit('join-bill', billId);
    return socket;
};

export const disconnectSocket = () => {
    socket?.disconnect();
    socket = null;
};