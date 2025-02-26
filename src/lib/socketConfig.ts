// src/lib/socketConfig.ts

// Configure whether we use Socket.IO or Pusher for real-time updates
// We should only use one to avoid duplicates

export const REALTIME_CONFIG = {
    // Set this to true to enable Socket.IO, false to disable
    USE_SOCKET_IO: false,
    
    // Set this to true to enable Pusher, false to disable
    USE_PUSHER: true,
    
    // Debug mode
    DEBUG: true
  };