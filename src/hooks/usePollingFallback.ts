// src/hooks/usePollingFallback.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import useSocket from './usePusher';

// This hook implements a polling fallback for real-time updates
export function usePollingFallback<T>(
  dataType: 'orders' | 'notifications',
  initialData: T[] = [],
  pollingInterval = 5000
) {
  const [data, setData] = useState<T[]>(initialData);
  const { isConnected } = useSocket();
  const [isPolling, setIsPolling] = useState(false);

  // Function to fetch latest data - using useCallback to avoid ESLint warnings
  const fetchLatestData = useCallback(async () => {
    try {
      const response = await fetch(`/api/${dataType}`);
      if (!response.ok) throw new Error(`Failed to fetch ${dataType}`);
      const newData = await response.json();
      setData(newData);
      console.log(`Polling: Fetched ${newData.length} ${dataType}`);
    } catch (error) {
      console.error(`Polling error for ${dataType}:`, error);
    }
  }, [dataType]);

  // Start polling when socket is disconnected
  useEffect(() => {
    if (!isConnected) {
      setIsPolling(true);
      console.log(`Socket disconnected, starting polling for ${dataType}...`);
      
      // Fetch immediately
      fetchLatestData();
      
      // Then set up interval
      const interval = setInterval(fetchLatestData, pollingInterval);
      
      return () => {
        clearInterval(interval);
        setIsPolling(false);
      };
    } else {
      setIsPolling(false);
    }
  }, [isConnected, dataType, pollingInterval, fetchLatestData]);

  return { data, setData, isPolling };
}