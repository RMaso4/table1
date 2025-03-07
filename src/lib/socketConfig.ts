// src/lib/socketConfig.ts

// Configure whether we use Socket.IO or Pusher for real-time updates
// We should only use one to avoid duplicates

export const REALTIME_CONFIG = {
  // Disable Socket.IO to prevent duplicate updates
  USE_SOCKET_IO: false,

  // Enable Pusher with better configuration
  USE_PUSHER: true,

  // Debug mode - set to false in production
  DEBUG: process.env.NODE_ENV === 'production',

  // Throttling and rate limiting
  THROTTLE: {
    // Minimum time between processing updates for the same order (milliseconds)
    MIN_UPDATE_INTERVAL: 3000,

    // Time to retain update history for deduplication (milliseconds)
    DEDUPLICATION_TTL: 30000
  }
};