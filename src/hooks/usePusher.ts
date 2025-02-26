// src/hooks/usePusher.ts
'use client';

import { useEffect, useState } from 'react';
import { pusherClient, CHANNELS, EVENTS } from '@/lib/pusher';
import { useSession } from 'next-auth/react';

// Define proper types instead of using 'any'
type PusherEvent = {
  orderId?: string;
  data?: unknown; // Changed from any to unknown
  id?: string;
  message?: string;
  userId?: string;
  read?: boolean;
  createdAt?: string;
};

// Create an interface for the trigger function parameters
interface TriggerParams {
  event: string;
  data: Record<string, unknown>;
}

export default function usePusher() {
  const [isConnected, setIsConnected] = useState(false);
  const { data: session } = useSession();
  const [lastOrderUpdate, setLastOrderUpdate] = useState<PusherEvent | null>(null);
  const [lastNotification, setLastNotification] = useState<PusherEvent | null>(null);
  
  useEffect(() => {
    if (!session?.user) return;
    
    // Mark connection as established
    setIsConnected(true);
    
    // Subscribe to channels
    const ordersChannel = pusherClient.subscribe(CHANNELS.ORDERS);
    const notificationsChannel = pusherClient.subscribe(CHANNELS.NOTIFICATIONS);
    
    // Listen for order updates
    ordersChannel.bind(EVENTS.ORDER_UPDATED, (data: PusherEvent) => {
      console.log('Order updated:', data);
      setLastOrderUpdate(data);
    });
    
    // Listen for notifications
    notificationsChannel.bind(EVENTS.NOTIFICATION_NEW, (data: PusherEvent) => {
      console.log('New notification:', data);
      setLastNotification(data);
    });
    
    // Clean up
    return () => {
      ordersChannel.unbind_all();
      notificationsChannel.unbind_all();
      pusherClient.unsubscribe(CHANNELS.ORDERS);
      pusherClient.unsubscribe(CHANNELS.NOTIFICATIONS);
      setIsConnected(false);
    };
  }, [session]);
  
  // Function to trigger events (similar to socket.emit)
  const trigger = async (event: string, data: Record<string, unknown>) => {
    try {
      await fetch('/api/socket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event, data }),
      });
      return true;
    } catch (error) {
      console.error('Failed to trigger event:', error);
      return false;
    }
  };
  
  return { 
    isConnected,
    trigger,
    lastOrderUpdate,
    lastNotification
  };
}