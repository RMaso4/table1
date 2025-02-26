// src/hooks/useSocket.ts
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

// Create a socket instance outside the component to maintain a single connection
let socket: Socket | null = null;

export default function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const { data: session } = useSession();
  
  useEffect(() => {
    // Only initialize the socket if we have a session
    if (!socket && session?.user) {
      console.log('Initializing socket connection with user data...');
      
      // Create the socket connection with user info in query params
      socket = io({
        path: '/api/socket',
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'],
        query: {
          userId: session.user.id,
          role: session.user.role
        }
      });
      
      socket.on('connect', () => {
        console.log('Socket connected with ID:', socket?.id);
        setIsConnected(true);
        
        // Send a ping to test the connection
        socket?.emit('ping_server', { clientTime: new Date().toISOString() });
      });
      
      socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });
      
      socket.on('connect_error', (err: Error) => {
        console.error('Socket connection error:', err);
        setIsConnected(false);
      });
      
      socket.on('error', (err: Error) => {
        console.error('Socket error:', err);
      });
    }
    
    // Cleanup function
    return () => {
      if (socket) {
        console.log('Cleaning up socket listeners');
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('error');
      }
    };
  }, [session]);
  
  // If the user session changes, we should reconnect the socket
  useEffect(() => {
    if (socket && session?.user) {
      if (socket.disconnected) {
        socket.connect();
      }
    }
  }, [session]);
  
  return { socket, isConnected };
}