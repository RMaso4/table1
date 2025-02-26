// src/hooks/usePusher.ts - Enhance to better handle real-time data
'use client';

import { useEffect, useState, useCallback } from 'react';
import { pusherClient, CHANNELS, EVENTS } from '@/lib/pusher';
import { useSession } from 'next-auth/react';

// Define more specific types for our event data
type OrderData = Record<string, any>;

interface OrderUpdateEvent {
  orderId: string;
  data: OrderData;
}

interface NotificationEvent {
  id: string;
  message: string;
  orderId: string;
  userId: string;
  read: boolean;
  createdAt: string;
}

export default function usePusher() {
  const [isConnected, setIsConnected] = useState(false);
  const { data: session } = useSession();
  const [lastOrderUpdate, setLastOrderUpdate] = useState<OrderUpdateEvent | null>(null);
  const [lastNotification, setLastNotification] = useState<NotificationEvent | null>(null);
  const [orderUpdates, setOrderUpdates] = useState<OrderUpdateEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  
  // Connection status management
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!session?.user) return;
    
    let connected = false;
    setConnectionAttempts(prev => prev + 1);
    
    try {
      // Mark connection as establishing
      console.log('Establishing Pusher connection...');
      
      // Subscribe to channels
      const ordersChannel = pusherClient.subscribe(CHANNELS.ORDERS);
      const notificationsChannel = pusherClient.subscribe(CHANNELS.NOTIFICATIONS);
      
      // Set up connection status handler
      pusherClient.connection.bind('connected', () => {
        console.log('Pusher connection established');
        setIsConnected(true);
        connected = true;
        setConnectionError(null);
      });
      
      pusherClient.connection.bind('error', (err: any) => {
        console.error('Pusher connection error:', err);
        setConnectionError(err?.message || 'Connection error');
        setIsConnected(false);
      });
      
      // Listen for order updates
      ordersChannel.bind(EVENTS.ORDER_UPDATED, (data: OrderUpdateEvent) => {
        console.log('Pusher: Order update received:', data);
        
        // Validate the data structure
        if (!data || !data.orderId) {
          console.error('Invalid order update format:', data);
          return;
        }
        
        // Store the last update
        setLastOrderUpdate(data);
        
        // Add to the history of updates
        setOrderUpdates(prev => [data, ...prev].slice(0, 50));
      });
      
      // Listen for notifications
      notificationsChannel.bind(EVENTS.NOTIFICATION_NEW, (data: NotificationEvent) => {
        console.log('Pusher: Notification received:', data);
        
        if (!data || !data.id) {
          console.error('Invalid notification format:', data);
          return;
        }
        
        setLastNotification(data);
        setNotifications(prev => [data, ...prev].slice(0, 50));
      });
    } catch (error) {
      console.error('Error setting up Pusher:', error);
      setConnectionError(`Setup error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Clean up
    return () => {
      console.log('Cleaning up Pusher connection...');
      
      // Unbind all events
      if (pusherClient.connection) {
        pusherClient.connection.unbind_all();
      }
      
      // Unsubscribe from channels
      try {
        pusherClient.unsubscribe(CHANNELS.ORDERS);
        pusherClient.unsubscribe(CHANNELS.NOTIFICATIONS);
      } catch (error) {
        console.error('Error unsubscribing from channels:', error);
      }
      
      // Only update connection state if we were connected
      if (connected) {
        setIsConnected(false);
      }
    };
  }, [session]);
  
  // Function to trigger events
  const trigger = useCallback(async (event: string, data: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/socket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event, data }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error triggering event:', errorData);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to trigger event:', error);
      return false;
    }
  }, []);
  
  return { 
    isConnected,
    connectionAttempts,
    connectionError,
    trigger,
    lastOrderUpdate,
    lastNotification,
    orderUpdates,
    notifications
  };
}