// src/lib/socketBridge.ts
// This file serves as a bridge between our Pulse streams and the Socket.IO server

import { Server as SocketIOServer } from 'socket.io';

// This is an import type to match the socket server interface
export interface SocketService {
  initSocketIO: (httpServer: unknown) => SocketIOServer;
  getIO: () => SocketIOServer | null;
  emitOrderUpdate: (orderId: string, orderData: unknown) => Promise<boolean>;
  emitNotification: (notification: unknown) => Promise<boolean>;
}

// API functions that route to the socket service via fetch for client-side code
export async function emitOrderUpdate(orderId: string, orderData: unknown): Promise<boolean> {
  try {
    const response = await fetch(`/api/socket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'order:updated',
        data: {
          orderId,
          data: orderData
        }
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to emit order update:', error);
    return false;
  }
}

export async function emitNotification(notification: unknown): Promise<boolean> {
  try {
    const response = await fetch(`/api/socket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'notification:new',
        data: notification
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to emit notification:', error);
    return false;
  }
}