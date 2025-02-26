// src/hooks/usePusher.ts
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { pusherClient, CHANNELS, EVENTS } from '@/lib/pusher';
import { useSession } from 'next-auth/react';

// Define more specific types for our event data
interface OrderData {
  id: string;
  verkoop_order: string;
  project?: string;
  debiteur_klant?: string;
  [key: string]: any;
}

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
  const channelsRef = useRef<{[key: string]: any}>({});
  
  // Reconnection logic
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const connectToPusher = useCallback(() => {
    if (!session?.user) return false;
    
    try {
      // Clear any previous reconnection timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Increment connection attempts
      setConnectionAttempts(prev => prev + 1);
      console.log(`Pusher connection attempt #${connectionAttempts + 1}`);
      
      // Ensure pusher connects
      if (pusherClient.connection.state !== 'connected') {
        pusherClient.connect();
      }
      
      return true;
    } catch (error) {
      console.error('Error connecting to Pusher:', error);
      setConnectionError(`Connection error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }, [session, connectionAttempts]);
  
  // Set up channels and event listeners
  const setupChannels = useCallback(() => {
    try {
      // Clean up any existing subscriptions
      Object.values(channelsRef.current).forEach(channel => {
        if (channel && typeof channel.unbind_all === 'function') {
          channel.unbind_all();
        }
      });
      channelsRef.current = {};
      
      // Subscribe to channels
      const ordersChannel = pusherClient.subscribe(CHANNELS.ORDERS);
      const notificationsChannel = pusherClient.subscribe(CHANNELS.NOTIFICATIONS);
      
      // Store channels for cleanup
      channelsRef.current.orders = ordersChannel;
      channelsRef.current.notifications = notificationsChannel;
      
      // Set up order update handler
      ordersChannel.bind(EVENTS.ORDER_UPDATED, (data: OrderUpdateEvent) => {
        console.log('Pusher: Order update received:', data);
        
        // Validate data
        if (!data || !data.orderId || !data.data) {
          console.error('Invalid order update format:', data);
          return;
        }
        
        // Update state with the new data
        setLastOrderUpdate(data);
        setOrderUpdates(prev => [data, ...prev].slice(0, 50));
      });
      
      // Set up notification handler
      notificationsChannel.bind(EVENTS.NOTIFICATION_NEW, (data: NotificationEvent) => {
        console.log('Pusher: Notification received:', data);
        
        // Validate data
        if (!data || !data.id) {
          console.error('Invalid notification format:', data);
          return;
        }
        
        // Update state with the new notification
        setLastNotification(data);
        setNotifications(prev => [data, ...prev].slice(0, 50));
      });
      
      return true;
    } catch (error) {
      console.error('Error setting up Pusher channels:', error);
      setConnectionError(`Channel setup error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }, []);
  
  // Main effect to handle Pusher connection
  useEffect(() => {
    if (!session?.user) return;
    
    // Set up connection state handlers
    const handleConnected = () => {
      console.log('Pusher connection established');
      setIsConnected(true);
      setConnectionError(null);
      
      // Set up channels when connected
      setupChannels();
    };
    
    const handleDisconnected = () => {
      console.log('Pusher disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect after a delay
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect to Pusher...');
        connectToPusher();
      }, 3000);
    };
    
    const handleError = (err: any) => {
      console.error('Pusher connection error:', err);
      setConnectionError(err?.message || 'Connection error');
      setIsConnected(false);
    };
    
    // Bind connection event handlers
    pusherClient.connection.bind('connected', handleConnected);
    pusherClient.connection.bind('disconnected', handleDisconnected);
    pusherClient.connection.bind('error', handleError);
    
    // Initial connection
    if (pusherClient.connection.state !== 'connected') {
      connectToPusher();
    } else {
      // If already connected, set up channels
      setIsConnected(true);
      setupChannels();
    }
    
    // Cleanup function
    return () => {
      // Remove event handlers
      pusherClient.connection.unbind('connected', handleConnected);
      pusherClient.connection.unbind('disconnected', handleDisconnected);
      pusherClient.connection.unbind('error', handleError);
      
      // Clean up channels
      Object.values(channelsRef.current).forEach(channel => {
        if (channel && typeof channel.unbind_all === 'function') {
          channel.unbind_all();
        }
      });
      
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [session, connectToPusher, setupChannels]);
  
  // Function to trigger events through the API
  const trigger = useCallback(async (event: string, data: Record<string, unknown>) => {
    try {
      console.log(`Triggering event "${event}" with data:`, data);
      
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
      
      console.log(`Successfully triggered event "${event}"`);
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
    reconnect: connectToPusher,
    lastOrderUpdate,
    lastNotification,
    orderUpdates,
    notifications
  };
}