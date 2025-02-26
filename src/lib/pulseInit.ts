// src/lib/pulseInit.ts

// Import using ES Module syntax
import { initPulseStreams } from './pulseService';

// Default export for dynamic import in server.js
export default async function init() {
  try {
    console.log('Initializing real-time updates...');
    await initPulseStreams();
    console.log('Real-time updates initialized successfully');
  } catch (error) {
    console.error('Failed to initialize real-time updates:', error);
  }
}