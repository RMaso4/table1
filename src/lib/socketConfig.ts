// src/lib/socketConfig.ts

// Configure whether we use Socket.IO or Pusher for real-time updates
// We should only use one to avoid duplicates

export const REALTIME_CONFIG = {
  // Set this to false to disable Socket.IO
  USE_SOCKET_IO: false,
  
  // Set this to true to enable Pusher
  USE_PUSHER: true,
  
  // Debug mode
  DEBUG: true
};