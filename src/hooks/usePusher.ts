// src/hooks/usePusher.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { pusherClient, CHANNELS, EVENTS } from '@/lib/pusher';
import { REALTIME_CONFIG } from '@/lib/socketConfig';

// Simplified type definitions
interface OrderUpdateEvent {
  orderId: string;
  data: Record<string, unknown>;
}

interface NotificationEvent {
  id: string;
  message: string;
  createdAt: string;
}

export default function usePusher() {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  // Stable references for updates
  const [lastOrderUpdate, setLastOrderUpdate] = useState<OrderUpdateEvent | null>(null);
  const [lastNotification, setLastNotification] = useState<NotificationEvent | null>(null);
  const [orderUpdates, setOrderUpdates] = useState<OrderUpdateEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);

  // Refs to track processed updates and prevent duplicates
  const processedOrdersRef = useRef(new Set<string>());
  const processedNotificationsRef = useRef(new Set<string>());

  // Disconnect handler - extracted to prevent nested hooks
  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    setConnectionError('Disconnected from Pusher');
  }, []);

  // Connection error handler
  const handleConnectionError = useCallback((error: Error) => {
    console.error('Pusher connection error:', error);
    setConnectionError(error.message);
    setIsConnected(false);
  }, []);

  // Channel setup logic - no nested hooks
  const setupChannels = useCallback(() => {
    if (!REALTIME_CONFIG.USE_PUSHER || !session) return;

    try {
      // Unsubscribe from existing channels first
      pusherClient.unbind_all();
      
      const ordersChannel = pusherClient.subscribe(CHANNELS.ORDERS);
      const notificationsChannel = pusherClient.subscribe(CHANNELS.NOTIFICATIONS);

      // Order updates handler
      ordersChannel.bind(EVENTS.ORDER_UPDATED, (data: OrderUpdateEvent) => {
        if (!data?.orderId) return;

        // Prevent duplicate processing
        if (processedOrdersRef.current.has(data.orderId)) return;
        processedOrdersRef.current.add(data.orderId);

        // Update state with new order update
        setLastOrderUpdate(data);
        setOrderUpdates(prev => [data, ...prev].slice(0, 50));

        // Clean up processed orders
        setTimeout(() => {
          processedOrdersRef.current.delete(data.orderId);
        }, 5000);
      });

      // Notifications handler
      notificationsChannel.bind(EVENTS.NOTIFICATION_NEW, (data: NotificationEvent) => {
        if (!data?.id) return;

        // Prevent duplicate processing
        if (processedNotificationsRef.current.has(data.id)) return;
        processedNotificationsRef.current.add(data.id);

        // Update state with new notification
        setLastNotification(data);
        setNotifications(prev => [data, ...prev].slice(0, 50));

        // Clean up processed notifications
        setTimeout(() => {
          processedNotificationsRef.current.delete(data.id);
        }, 5000);
      });

      // Set connected state
      setIsConnected(true);
      setConnectionError(null);
    } catch (error) {
      handleConnectionError(error instanceof Error ? error : new Error('Channel setup failed'));
    }
  }, [session, handleConnectionError]);

  // Main connection effect
  useEffect(() => {
    if (!REALTIME_CONFIG.USE_PUSHER || !session) return;

    // Configure Pusher connection handlers
    pusherClient.connection.bind('connected', () => {
      setIsConnected(true);
      setConnectionAttempts(prev => prev + 1);
      setupChannels();
    });

    pusherClient.connection.bind('disconnected', handleDisconnect);
    pusherClient.connection.bind('error', handleConnectionError);

    // Trigger initial connection
    if (pusherClient.connection.state !== 'connected') {
      pusherClient.connect();
    }

    // Cleanup function
    return () => {
      pusherClient.connection.unbind('connected');
      pusherClient.connection.unbind('disconnected');
      pusherClient.connection.unbind('error');
      pusherClient.disconnect();
    };
  }, [session, setupChannels, handleDisconnect, handleConnectionError]);

  // Event trigger method
  const trigger = useCallback(async (event: string, data: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Event trigger failed:', error);
      return false;
    }
  }, []);

  // Reconnection method
  const reconnect = useCallback(() => {
    if (!REALTIME_CONFIG.USE_PUSHER) return false;
    
    pusherClient.disconnect();
    setTimeout(() => {
      pusherClient.connect();
      setupChannels();
    }, 500);
    
    return true;
  }, [setupChannels]);

  // Return hook state and methods
  return { 
    isConnected, 
    connectionAttempts, 
    connectionError, 
    trigger, 
    reconnect, 
    lastOrderUpdate, 
    lastNotification,
    orderUpdates,
    notifications 
  };
}