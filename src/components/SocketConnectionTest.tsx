// src/components/SocketConnectionTest.tsx
'use client';

import { useState, useEffect } from 'react';
import usePusher from '@/hooks/usePusher';

export default function SocketConnectionTest() {
  const { isConnected, trigger, lastOrderUpdate, lastNotification } = usePusher();
  const [messages, setMessages] = useState<string[]>([]);
  
  useEffect(() => {
    if (lastOrderUpdate) {
      addMessage(`Order updated: ${lastOrderUpdate.orderId || 'unknown'}`);
    }
  }, [lastOrderUpdate]);
  
  useEffect(() => {
    if (lastNotification) {
      addMessage(`New notification: ${lastNotification.message || 'unknown'}`);
    }
  }, [lastNotification]);
  
  const addMessage = (message: string) => {
    setMessages(prev => [message, ...prev].slice(0, 10));
  };
  
  const sendTestPing = () => {
    addMessage('Sending test ping...');
    trigger('ping_server', { message: 'Test ping', time: new Date().toISOString() });
  };
  
  const triggerTestNotification = async () => {
    try {
      const response = await fetch('/api/test-socket', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      addMessage(`Test events triggered: ${data.message || 'success'}`);
    } catch (err) {
      addMessage(`Error triggering test: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  return (
    <div className="p-4 border rounded-md">
      <h2 className="text-lg font-semibold mb-2">Real-time Connection Status</h2>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <p>
            {isConnected ? '🟢 Connected to Pusher' : '🔴 Disconnected from Pusher'}
          </p>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={sendTestPing}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Send Test Ping
        </button>
        <button
          onClick={triggerTestNotification}
          className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Trigger Test Event
        </button>
      </div>
      
      <div>
        <h3 className="text-md font-medium mb-2">Recent Events</h3>
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
            <p className="text-gray-500 text-sm">No events yet</p>
          )}
        </div>
      </div>
    </div>
  );
}