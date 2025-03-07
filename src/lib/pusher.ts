// src/lib/pusher.ts - Add priority events
import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Verify environment variables
const PUSHER_APP_ID = process.env.PUSHER_APP_ID;
const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_SECRET = process.env.PUSHER_SECRET;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

// Check client-side environment variables and log warnings
if (typeof window !== 'undefined') {
  if (!PUSHER_KEY) {
    console.error('NEXT_PUBLIC_PUSHER_KEY is missing. Real-time updates will not work.');
  }

  if (!PUSHER_CLUSTER) {
    console.error('NEXT_PUBLIC_PUSHER_CLUSTER is missing. Real-time updates will not work.');
  }
}

// Server-side Pusher instance
export const pusherServer = new Pusher({
  appId: PUSHER_APP_ID || '',
  key: PUSHER_KEY || '',
  secret: PUSHER_SECRET || '',
  cluster: PUSHER_CLUSTER || 'eu',
  useTLS: true,
});

// Client-side Pusher instance with enhanced configuration
export const pusherClient = new PusherClient(
  PUSHER_KEY || '',
  {
    cluster: PUSHER_CLUSTER || 'eu',
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
    disabledTransports: ['xhr_streaming', 'xhr_polling'],
    // Automatically handle reconnection
    activityTimeout: 120000,
    pongTimeout: 30000,
    // Fix third-party cookie issues
    authEndpoint: '/api/pusher/auth',
    // Add cookie params to help with third-party cookie issues
    auth: {
      params: {
        // Add a timestamp to avoid caching
        _: Date.now()
      }
    },
    // Connection will be managed manually using connect() and disconnect() methods
  }
);

// Add global error and debug logging
if (typeof window !== 'undefined') {
  // Set up custom debug logging
  const originalLog = console.log;
  const originalError = console.error;

  // Only in development, add Pusher prefixes to console logs
  if (process.env.NODE_ENV === 'development') {
    console.log = function (...args) {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('Pusher')) {
        originalLog.apply(console, ['[PUSHER]', ...args]);
      } else {
        originalLog.apply(console, args);
      }
    };

    console.error = function (...args) {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('Pusher')) {
        originalError.apply(console, ['[PUSHER ERROR]', ...args]);
      } else {
        originalError.apply(console, args);
      }
    };
  }

  // Log connection issues
  pusherClient.connection.bind('error', (err: Error | { type: string; error: Error }) => {
    console.error('Pusher connection error:', err);
  });

  // Log successful connections
  pusherClient.connection.bind('connected', () => {
    console.log('Pusher connected successfully with socket ID:', pusherClient.connection.socket_id);
  });

  // Log disconnections
  pusherClient.connection.bind('disconnected', () => {
    console.log('Pusher disconnected');
  });

  // Help debug subscription issues
  pusherClient.connection.bind('state_change', (states: { previous: string; current: string }) => {
    console.log(`Pusher connection state changed from ${states.previous} to ${states.current}`);
  });
}

// Define channel names
export const CHANNELS = {
  ORDERS: 'orders-channel',
  NOTIFICATIONS: 'notifications-channel',
};

// Define event names
export const EVENTS = {
  ORDER_UPDATED: 'order:updated',
  NOTIFICATION_NEW: 'notification:new',
  PRIORITY_UPDATED: 'priority:updated', // New event for priority updates
};