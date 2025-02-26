'use client';

import React, { useState, useEffect } from 'react';
import usePusher from '@/hooks/usePusher';
// Remove unused imports
// import { CHANNELS, EVENTS } from '@/lib/pusher';
import PusherConnectionDebugger from './PusherConnectionDebugger';

// Define types for the test result
interface TestResult {
  success?: boolean;
  message?: string;
  triggered?: {
    notification?: boolean;
    order?: boolean;
  };
  testOrderUpdate?: {
    orderId?: string;
    data?: {
      id?: string;
      verkoop_order?: string;
      [key: string]: unknown;
    };
  };
  error?: string;
  [key: string]: unknown;
}

export default function RealTimeTestingTool() {
  const { 
    isConnected, 
    connectionAttempts, 
    connectionError, 
    trigger, 
    reconnect, 
    lastOrderUpdate, 
    lastNotification 
  } = usePusher();
  
  const [messages, setMessages] = useState<string[]>([]);
  const [testMode, setTestMode] = useState<'all' | 'order' | 'notification'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  
  // Add messages to the log
  const addMessage = (message: string) => {
    setMessages(prev => [message, ...prev].slice(0, 10));
  };
  
  // Watch for real-time updates
  useEffect(() => {
    if (lastOrderUpdate) {
      addMessage(`✅ Order update received: ${lastOrderUpdate.orderId || 'unknown'}`);
    }
  }, [lastOrderUpdate]);
  
  useEffect(() => {
    if (lastNotification) {
      addMessage(`✅ Notification received: ${lastNotification.message || 'unknown'}`);
    }
  }, [lastNotification]);
  
  // Test the Pusher connection by sending a ping
  const testConnection = async () => {
    addMessage('🔄 Testing connection...');
    const pingData = { 
      message: 'Connection test', 
      timestamp: new Date().toISOString(),
      connectionId: connectionAttempts
    };
    
    try {
      // Testing using direct client method
      if (isConnected) {
        addMessage('📡 Sending test event via trigger()...');
        const result = await trigger('ping_server', pingData);
        addMessage(result ? '✅ Test event sent successfully' : '❌ Failed to send test event');
      } else {
        addMessage('❌ Cannot test - not connected to Pusher');
        reconnect();
      }
    } catch (error) {
      addMessage(`❌ Error testing connection: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Test with server API
  const triggerServerTest = async () => {
    try {
      setIsLoading(true);
      addMessage(`🔄 Triggering ${testMode} test event(s) via API...`);
      
      const response = await fetch('/api/test-socket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: testMode })
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json() as TestResult;
      setTestResult(data);
      addMessage(`✅ API test triggered: ${data.message || 'success'}`);
      
      if (testMode === 'all' || testMode === 'order') {
        addMessage(`📊 Test order: ${data.testOrderUpdate?.data?.verkoop_order || 'unknown'}`);
      }
    } catch (error) {
      addMessage(`❌ API test failed: ${error instanceof Error ? error.message : String(error)}`);
      setTestResult({ error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <h2 className="font-semibold text-lg">Real-Time Testing Tools</h2>
      
      {/* Connection Status */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="font-medium">
          {isConnected ? 'Connected to Pusher' : 'Disconnected from Pusher'}
        </span>
        
        {connectionError && (
          <span className="text-sm text-red-600 ml-2">
            Error: {connectionError}
          </span>
        )}
      </div>
      
      {/* Test Controls */}
      <div className="flex items-center space-x-4">
        <div>
          <label className="text-sm mr-2">Test Mode:</label>
          <select 
            value={testMode}
            onChange={(e) => setTestMode(e.target.value as 'all' | 'order' | 'notification')}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">All Events</option>
            <option value="order">Order Update Only</option>
            <option value="notification">Notification Only</option>
          </select>
        </div>
        
        <button
          onClick={testConnection}
          disabled={!isConnected}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          Test Connection
        </button>
        
        <button
          onClick={triggerServerTest}
          disabled={isLoading}
          className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Testing...' : 'Trigger Server Test'}
        </button>
        
        <button
          onClick={reconnect}
          className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
        >
          Reconnect
        </button>
      </div>
      
      {/* Event Log */}
      <div>
        <h3 className="text-sm font-medium mb-1">Event Log:</h3>
        <div className="border rounded p-2 max-h-40 overflow-y-auto bg-gray-50">
          {messages.length > 0 ? (
            <ul className="text-sm">
              {messages.map((msg, i) => (
                <li key={i} className="py-1 border-b border-gray-100">
                  {msg}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No events yet. Run a test to see results.</p>
          )}
        </div>
      </div>
      
      {/* Advanced Diagnostics */}
      <div className="pt-2 border-t">
        <details>
          <summary className="text-sm font-medium cursor-pointer">Advanced Diagnostics</summary>
          <div className="mt-2">
            <PusherConnectionDebugger />
          </div>
        </details>
      </div>
      
      {/* Last Test Result */}
      {testResult && (
        <div className="pt-2 border-t">
          <details>
            <summary className="text-sm font-medium cursor-pointer">Last Test Result</summary>
            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}