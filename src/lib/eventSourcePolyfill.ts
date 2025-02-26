// src/lib/eventSourcePolyfill.ts
'use client';

import { useEffect } from 'react';

export function useEventSourcePolyfill() {
  useEffect(() => {
    // Only add polyfill if EventSource is not available
    if (typeof EventSource === 'undefined') {
      console.log('EventSource not available, loading polyfill');
      
      // Use a properly formatted dynamic import
      import('event-source-polyfill')
        .then(() => {
          console.log('EventSource polyfill loaded successfully');
        })
        .catch((error: Error) => {
          console.error('Failed to load EventSource polyfill:', error);
        });
    }
  }, []);
}