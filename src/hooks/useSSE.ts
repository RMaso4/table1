// src/hooks/useSSE.ts
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

// Generic type for better type safety
export default function useSSE<T = unknown>(eventType: string, initialData: T | null = null) {
  const [data, setData] = useState<T | null>(initialData);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status } = useSession();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Only initialize SSE if authenticated
    if (status === 'authenticated') {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        // Create new EventSource connection
        const eventSource = new EventSource('/api/events');
        eventSourceRef.current = eventSource;

        // Connection opened
        eventSource.onopen = () => {
          console.log('SSE connection established');
          setIsConnected(true);
          setError(null);
        };

        // Listen for specific event type
        eventSource.addEventListener(eventType, (event) => {
          try {
            const newData = JSON.parse(event.data) as T;
            console.log(`SSE received ${eventType} event:`, newData);
            setData(newData);
          } catch (err) {
            console.error('Error parsing SSE event data:', err);
          }
        });

        // Error handling
        eventSource.onerror = (err) => {
          console.error('SSE connection error:', err);
          setIsConnected(false);
          setError('Connection error');
          
          // Try to reconnect
          eventSource.close();
          eventSourceRef.current = null;
        };

        // Cleanup
        return () => {
          console.log('Closing SSE connection');
          eventSource.close();
          eventSourceRef.current = null;
        };
      } catch (err) {
        console.error('Error setting up SSE:', err);
        setError('Failed to initialize connection');
      }
    }
  }, [status, eventType]);

  return { data, isConnected, error };
}