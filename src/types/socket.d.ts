// src/types/socket.d.ts
import { Socket as SocketIOClient } from 'socket.io-client';

interface Order {
  id: string;
  verkoop_order: string;
  // Add other order fields as needed
}

interface Notification {
  id: string;
  message: string;
  orderId: string;
  userId: string;
  read: boolean;
  createdAt: string;
}

// Define the events we expect to receive
interface ServerToClientEvents {
  'order:updated': (data: { orderId: string; data: Order }) => void;
  'notification:new': (notification: Notification) => void;
  'user_connected': (data: { socketId: string; timestamp: string }) => void;
  'pong_client': (data: { received: unknown; serverTime: string }) => void;
}

// Define the events we will emit
interface ClientToServerEvents {
  'ping_server': (data: { message: string; time: string; clientId?: string }) => void;
}

// Placeholder type for additional socket features
interface SocketExtensions {
  _socket?: {
    // Add any additional socket-specific properties if needed
    reconnectionAttempts?: number;
  };
}

// Extend the Socket type with our custom events
declare module 'socket.io-client' {
  export interface Socket
    extends SocketIOClient<ServerToClientEvents, ClientToServerEvents>,
    SocketExtensions { }
}