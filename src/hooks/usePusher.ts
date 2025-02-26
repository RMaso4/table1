'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { pusherClient, CHANNELS, EVENTS } from '@/lib/pusher';
import { useSession } from 'next-auth/react';

// Define more specific types for our event data
interface OrderData {
  id?: string;
  verkoop_order?: string;
  project?: string;
  debiteur_klant?: string;
  [key: string]: unknown;
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

// Type for connection error
interface PusherConnectionError {
  message: string;
  code?: number;
  type?: string;
  data?: unknown;
  [key: string]: unknown;
}

// Type for channel object
interface PusherChannel {
  unbind_all: () => void;
  bind: (eventName: string, callback: (data: unknown) => void) => void;
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
  const channelsRef = useRef<Record<string, PusherChannel | null>>({});
  
  // Enhanced duplicate prevention with both ID-based and content-based tracking
  const processedOrdersRef = useRef<Set<string>>(new Set());
  const processedOrderContentRef = useRef<Set<string>>(new Set());
  const processedNotificationsRef = useRef<Set<string>>(new Set());
  const processedNotificationContentRef = useRef<Set<string>>(new Set());
  
  // Flag to track if channels are already set up
  const channelsSetupRef = useRef(false);
  
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
    // Only set up channels once
    if (channelsSetupRef.current) {
      console.log('Channels already set up, skipping duplicate setup');
      return true;
    }
    
    try {
      console.log('Setting up Pusher channels');
      
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
      
      // Set up order update handler with improved deduplication
      ordersChannel.bind(EVENTS.ORDER_UPDATED, (data: OrderUpdateEvent) => {
        console.log('Pusher: Order update received:', data);
        
        // Validate data
        if (!data || !data.orderId || !data.data) {
          console.error('Invalid order update format:', data);
          return;
        }
        
        // Create a unique content fingerprint for this update
        const contentFingerprint = `${data.orderId}:${JSON.stringify(data.data)}`;
        
        // Check both forms of duplicates
        if (processedOrdersRef.current.has(data.orderId)) {
          console.log('Skipping duplicate order ID:', data.orderId);
          return;
        }
        
        if (processedOrderContentRef.current.has(contentFingerprint)) {
          console.log('Skipping duplicate order content:', contentFingerprint);
          return;
        }
        
        // Mark as processed to prevent duplicates
        processedOrdersRef.current.add(data.orderId);
        processedOrderContentRef.current.add(contentFingerprint);
        
        // Clear this order ID from processed list after a delay to allow future updates
        setTimeout(() => {
          processedOrdersRef.current.delete(data.orderId);
        }, 3000);
        
        // Clear content fingerprint after a longer delay
        setTimeout(() => {
          processedOrderContentRef.current.delete(contentFingerprint);
        }, 10000);
        
        // Update state with the new data
        setLastOrderUpdate(data);
        setOrderUpdates(prev => [data, ...prev].slice(0, 50));
      });
      
      // Set up notification handler with improved deduplication
      notificationsChannel.bind(EVENTS.NOTIFICATION_NEW, (data: NotificationEvent) => {
        console.log('Pusher: Notification received:', data);
        
        // Validate data
        if (!data || !data.id) {
          console.error('Invalid notification format:', data);
          return;
        }
        
        // Create content fingerprint for semantic duplicate detection
        const contentFingerprint = `${data.orderId}:${data.message}:${data.userId}`;
        
        // Check both forms of duplicates
        if (processedNotificationsRef.current.has(data.id)) {
          console.log('Skipping duplicate notification ID:', data.id);
          return;
        }
        
        if (processedNotificationContentRef.current.has(contentFingerprint)) {
          console.log('Skipping duplicate notification content:', contentFingerprint);
          return;
        }
        
        // Mark as processed to prevent duplicates
        processedNotificationsRef.current.add(data.id);
        processedNotificationContentRef.current.add(contentFingerprint);
        
        // Don't remove ID from processed list (IDs should be globally unique)
        // But clear content fingerprint after a delay to allow similar notifications
        setTimeout(() => {
          processedNotificationContentRef.current.delete(contentFingerprint);
        }, 30000);
        
        // Update state with the new notification
        setLastNotification(data);
        setNotifications(prev => [data, ...prev].slice(0, 50));
      });
      
      // Mark channels as set up to prevent duplicate setup
      channelsSetupRef.current = true;
      
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
      
      // Reset channels setup flag on disconnection
      channelsSetupRef.current = false;
      
      // Attempt to reconnect after a delay
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect to Pusher...');
        connectToPusher();
      }, 3000);
    };
    
    const handleError = (err: PusherConnectionError) => {
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
      
      // Reset channels setup flag
      channelsSetupRef.current = false;
      
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