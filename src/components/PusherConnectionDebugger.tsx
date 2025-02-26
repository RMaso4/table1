'use client';

import { useState, useEffect } from 'react';
import { pusherClient } from '@/lib/pusher';

export default function PusherConnectionDebugger() {
  const [connectionState, setConnectionState] = useState<string>('Not initialized');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  
  useEffect(() => {
    // Reset error on mount
    setErrorMessage(null);
    
    // Log connection states
    const connectionStateHandler = (state: string) => {
      console.log(`Pusher connection state changed to: ${state}`);
      setConnectionState(state);
      setLastActivity(new Date().toISOString());
      
      if (state === 'connected') {
        setSocketId(pusherClient.connection.socket_id);
      } else {
        setSocketId(null);
      }
    };
    
    // Log all connection events
    pusherClient.connection.bind('state_change', (states: { current: string }) => {
      connectionStateHandler(states.current);
    });
    
    // Specific handlers for different connection states
    pusherClient.connection.bind('connected', () => {
      setErrorMessage(null);
    });
    
    pusherClient.connection.bind('disconnected', () => {
      setErrorMessage('Disconnected from Pusher');
    });
    
    pusherClient.connection.bind('failed', () => {
      setErrorMessage('Connection to Pusher failed');
    });
    
    pusherClient.connection.bind('error', (err: any) => {
      console.error('Pusher connection error:', err);
      setErrorMessage(err?.message || 'Unknown connection error');
    });
    
    // Get initial state
    connectionStateHandler(pusherClient.connection.state);
    
    // Manual connection if not connected
    if (pusherClient.connection.state !== 'connected') {
      console.log('Attempting to connect to Pusher...');
      pusherClient.connect();
    }
    
    return () => {
      // Clean up event listeners
      pusherClient.connection.unbind_all();
    };
  }, []);
  
  const reconnect = () => {
    console.log('Manually reconnecting to Pusher...');
    pusherClient.disconnect();
    setTimeout(() => {
      pusherClient.connect();
    }, 500);
  };
  
  const checkEnvVariables = () => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    
    if (!key) {
      setErrorMessage('NEXT_PUBLIC_PUSHER_KEY is not set');
      return false;
    }
    
    if (!cluster) {
      setErrorMessage('NEXT_PUBLIC_PUSHER_CLUSTER is not set');
      return false;
    }
    
    setErrorMessage('Environment variables appear to be set correctly');
    return true;
  };
  
  return (
    <div className="p-4 border rounded-md bg-gray-50">
      <h3 className="font-medium mb-2">Pusher Connection Debugger</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="font-medium">Connection state:</span>
          <span className={`${
            connectionState === 'connected' ? 'text-green-600' : 
            connectionState === 'connecting' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {connectionState}
          </span>
        </div>
        
        {socketId && (
          <div className="flex justify-between">
            <span className="font-medium">Socket ID:</span>
            <span className="font-mono text-xs">{socketId}</span>
          </div>
        )}
        
        {lastActivity && (
          <div className="flex justify-between">
            <span className="font-medium">Last activity:</span>
            <span>{new Date(lastActivity).toLocaleTimeString()}</span>
          </div>
        )}
        
        {errorMessage && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700">
            {errorMessage}
          </div>
        )}
      </div>
      
      <div className="mt-4 flex space-x-2">
        <button 
          onClick={reconnect}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
        >
          Reconnect
        </button>
        
        <button 
          onClick={checkEnvVariables}
          className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
        >
          Check Env Variables
        </button>
      </div>
    </div>
  );
}