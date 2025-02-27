// src/hooks/usePusher.ts
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { pusherClient, CHANNELS, EVENTS } from '@/lib/pusher';
import { useSession } from 'next-auth/react';
import { REALTIME_CONFIG } from '@/lib/socketConfig';

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
  _meta?: {
    processedAt?: string;
    [key: string]: unknown;
  };
}

interface NotificationEvent {
  id: string;
  message: string;
  orderId: string;
  userId: string;
  read: boolean;
  createdAt: string;
}

// Type for connection errors
interface PusherConnectionError {
  message: string;
  code?: number;
  type?: string;
  data?: unknown;
  [key: string]: unknown;
}

// Type for channel objects
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
  
  // Enhanced deduplication with both ID-based and content-based tracking plus timestamps
  const processedOrdersRef = useRef<Set<string>>(new Set());
  const processedContentHashesRef = useRef<Map<string, string>>(new Map());
  const processedNotificationsRef = useRef<Set<string>>(new Set());
  const processedNotificationContentRef = useRef<Set<string>>(new Set());
  
  // Track when we last processed an update for each order ID
  const lastProcessedTimestampRef = useRef<Map<string, number>>(new Map());
  
  // Flag to track if channels are already set up
  const channelsSetupRef = useRef(false);
  
  // Reconnection logic
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to generate a content hash for an object (simple but effective)
  const getContentHash = (obj: Record<string, unknown>): string => {
    try {
      // Create a simplified representation of key properties for comparison
      const keyProps = {
        id: obj.id || '',
        vo: obj.verkoop_order || '',
        project: obj.project || '',
        customer: obj.debiteur_klant || '',
        material: obj.material || '',
        updated: obj.updatedAt || ''
      };
      return JSON.stringify(keyProps);
    } catch (_e) { // Fix: added underscore prefix
      // Fallback to full stringify if specific properties aren't available
      return JSON.stringify(obj);
    }
  };
  
  const connectToPusher = useCallback(() => {
    if (!session?.user || !REALTIME_CONFIG.USE_PUSHER) return false;
    
    try {
      // Clear any previous reconnection timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Increment connection attempts
      setConnectionAttempts(prev => prev + 1);
      if (REALTIME_CONFIG.DEBUG) {
        console.log(`Pusher connection attempt #${connectionAttempts + 1}`);
      }
      
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
  
  // Set up channels and event listeners with enhanced deduplication
  const setupChannels = useCallback(() => {
    // Only set up channels if Pusher is enabled
    if (!REALTIME_CONFIG.USE_PUSHER) return false;
    
    // Only set up channels once
    if (channelsSetupRef.current) {
      if (REALTIME_CONFIG.DEBUG) {
        console.log('Channels already set up, skipping duplicate setup');
      }
      return true;
    }
    
    try {
      if (REALTIME_CONFIG.DEBUG) {
        console.log('Setting up Pusher channels');
      }
      
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
      
      // IMPROVED: Order update handler with better deduplication
      ordersChannel.bind(EVENTS.ORDER_UPDATED, (data: OrderUpdateEvent) => {
        if (!data || !data.orderId || !data.data) {
          console.error('Invalid order update format:', data);
          return;
        }
        
        const now = Date.now();
        const orderId = data.orderId;
        
        // Multiple deduplication strategies:
        
        // 1. Check if we've seen this exact update already (by order ID)
        if (processedOrdersRef.current.has(orderId)) {
          // Check if this update is coming too soon after the last one (throttle)
          const lastProcessed = lastProcessedTimestampRef.current.get(orderId) || 0;
          if (now - lastProcessed < 2000) { // 2 second minimum delay between updates for same order
            if (REALTIME_CONFIG.DEBUG) {
              console.log(`Throttling rapid updates for order ${orderId} - too soon`);
            }
            return;
          }
        }
        
        // 2. Content-based deduplication 
        const contentHash = getContentHash(data.data);
        const existingContentHash = processedContentHashesRef.current.get(orderId);
        
        if (existingContentHash && contentHash === String(existingContentHash)) {
          if (REALTIME_CONFIG.DEBUG) {
            console.log(`Skipping duplicate content for order ${orderId}`);
          }
          return;
        }
        
        // If we get here, this is a new unique update we should process
        if (REALTIME_CONFIG.DEBUG) {
          console.log('Processing order update:', { orderId, data: data.data });
        }
        
        // Record that we've processed this order and update
        processedOrdersRef.current.add(orderId);
        processedContentHashesRef.current.set(orderId, contentHash);
        lastProcessedTimestampRef.current.set(orderId, now);
        
        // Update our state with the new data
        setLastOrderUpdate(data);
        setOrderUpdates(prev => [data, ...prev].slice(0, 50));
        
        // Schedule cleanup after a delay - significantly longer delay to allow for proper deduplication
        setTimeout(() => {
          processedOrdersRef.current.delete(orderId);
        }, 10000); // 10 seconds
      });
      
      // Set up notification handler with improved deduplication
      notificationsChannel.bind(EVENTS.NOTIFICATION_NEW, (data: NotificationEvent) => {
        if (!data || !data.id) {
          console.error('Invalid notification format:', data);
          return;
        }
        
        // Create more robust content fingerprint for semantic duplicate detection
        // Include timestamp (truncated to minute) to better handle similar notifications
        const timestamp = new Date(data.createdAt).toISOString().slice(0, 16); // Up to minutes
        const contentFingerprint = `${data.orderId}:${data.message}:${data.userId}:${timestamp}`;
        
        // Check both forms of duplicates
        if (processedNotificationsRef.current.has(data.id)) {
          if (REALTIME_CONFIG.DEBUG) {
            console.log('Skipping duplicate notification ID:', data.id);
          }
          return;
        }
        
        if (processedNotificationContentRef.current.has(contentFingerprint)) {
          if (REALTIME_CONFIG.DEBUG) {
            console.log('Skipping duplicate notification content:', contentFingerprint);
          }
          return;
        }
        
        // Mark as processed to prevent duplicates
        processedNotificationsRef.current.add(data.id);
        processedNotificationContentRef.current.add(contentFingerprint);
        
        // Keep these processed sets from growing unbounded
        setTimeout(() => {
          processedNotificationsRef.current.delete(data.id);
        }, 60000); // 1 minute
        
        // Clear content fingerprint after a delay to allow similar notifications
        setTimeout(() => {
          processedNotificationContentRef.current.delete(contentFingerprint);
        }, 60000); // 1 minute
        
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
    
    // Skip all Pusher-related logic if disabled in config
    if (!REALTIME_CONFIG.USE_PUSHER) return;
    
    // Set up connection state handlers
    const handleConnected = () => {
      if (REALTIME_CONFIG.DEBUG) {
        console.log('Pusher connection established');
      }
      setIsConnected(true);
      setConnectionError(null);
      
      // Set up channels when connected
      setupChannels();
    };
    
    const handleDisconnected = () => {
      if (REALTIME_CONFIG.DEBUG) {
        console.log('Pusher disconnected');
      }
      setIsConnected(false);
      
      // Reset channels setup flag on disconnection
      channelsSetupRef.current = false;
      
      // Attempt to reconnect after a delay
      reconnectTimeoutRef.current = setTimeout(() => {
        if (REALTIME_CONFIG.DEBUG) {
          console.log('Attempting to reconnect to Pusher...');
        }
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
      if (REALTIME_CONFIG.DEBUG) {
        console.log(`Triggering event "${event}" with data:`, data);
      }
      
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
      
      if (REALTIME_CONFIG.DEBUG) {
        console.log(`Successfully triggered event "${event}"`);
      }
      return true;
    } catch (error) {
      console.error('Failed to trigger event:', error);
      return false;
    }
  }, []);
  
  // If Pusher is disabled, return mock implementation
  if (!REALTIME_CONFIG.USE_PUSHER) {
    return {
      isConnected: false,
      connectionAttempts,
      connectionError: 'Pusher disabled in configuration',
      trigger,
      reconnect: () => false,
      lastOrderUpdate: null,
      lastNotification: null,
      orderUpdates: [],
      notifications: []
    };
  }
  
  // Return actual implementation
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