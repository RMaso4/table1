// src/lib/pulseInit.ts

// Import using ES Module syntax
import { initPulseStreams } from './pulseService';
import { REALTIME_CONFIG } from './socketConfig';

// Default export for dynamic import in server.js
export default async function init() {
  try {
    // Skip initialization if Socket.IO is disabled
    if (!REALTIME_CONFIG.USE_SOCKET_IO) {
      console.log('Real-time updates via Socket.IO disabled in config. Skipping initialization.');
      return;
    }

    console.log('Initializing real-time updates...');
    await initPulseStreams();
    console.log('Real-time updates initialized successfully');
  } catch (error) {
    console.error('Failed to initialize real-time updates:', error);
  }
}