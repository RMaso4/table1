// src/app/api/socket/route.ts
import { NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';
import { REALTIME_CONFIG } from '@/lib/socketConfig';

// Tracking sent events to prevent duplicate processing
const recentlySentEvents = new Map<string, number>();

// Clean up old events periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentlySentEvents.entries()) {
    if (now - timestamp > 60000) { // 1 minute TTL
      recentlySentEvents.delete(key);
    }
  }
}, 30000); // Run cleanup every 30 seconds

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const { event, data } = requestBody;
    
    // Skip Socket.IO if disabled, but still process with Pusher if enabled
    if (!REALTIME_CONFIG.USE_SOCKET_IO && REALTIME_CONFIG.DEBUG) {
      console.log('Socket.IO forwarding disabled in config');
    }
    
    if (REALTIME_CONFIG.DEBUG) {
      console.log(`API: Received event "${event}" with data:`, data);
    }
    
    // Validate input
    if (!event || !data) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }
    
    // Map the event to the appropriate channel and event name for Pusher
    let channel: string;
    let eventName: string;
    let payload: unknown = data;
    
    switch (event) {
      case 'order:updated':
        channel = CHANNELS.ORDERS;
        eventName = EVENTS.ORDER_UPDATED;
        
        // Ensure data is properly formatted
        if (typeof data === 'object' && data !== null && 'orderId' in data) {
          // Already in correct format
          payload = data;
        } else {
          // Try to adapt the data
          payload = {
            orderId: data.id || 'unknown-id',
            data: data
          };
        }
        
        // Generate a deduplication key based on order ID and content
        const orderId = typeof data === 'object' && data !== null && 'orderId' in data 
          ? data.orderId 
          : (data.id || 'unknown');
          
        // Create a fingerprint for deduplication
        const orderFingerprint = `${orderId}-${JSON.stringify(data).slice(0, 100)}`;
        
        // Check for duplicate events sent recently
        const now = Date.now();
        const lastSent = recentlySentEvents.get(orderFingerprint);
        
        if (lastSent && now - lastSent < 3000) { // 3 second throttle
          if (REALTIME_CONFIG.DEBUG) {
            console.log(`API: Throttling duplicate order update for ${orderId} (sent ${now - lastSent}ms ago)`);
          }
          
          // Return success to avoid client retries, but don't actually send the event
          return NextResponse.json({ 
            success: true,
            throttled: true,
            message: `Event "${event}" throttled to prevent duplicates`
          });
        }
        
        // Remember this event was sent
        recentlySentEvents.set(orderFingerprint, now);
        break;
        
      case 'notification:new':
        channel = CHANNELS.NOTIFICATIONS;
        eventName = EVENTS.NOTIFICATION_NEW;
        break;
        
      case 'ping_server':
        // Echo test event - use notifications channel
        channel = CHANNELS.NOTIFICATIONS;
        eventName = 'ping_test';
        payload = {
          ...data,
          serverTimestamp: new Date().toISOString(),
          echo: true
        };
        break;
        
      default:
        return NextResponse.json({ 
          error: 'Unknown event type' 
        }, { status: 400 });
    }
    
    // Process with Pusher if enabled
    if (REALTIME_CONFIG.USE_PUSHER) {
      if (REALTIME_CONFIG.DEBUG) {
        console.log(`API: Triggering Pusher event "${eventName}" on channel "${channel}"`);
      }
      
      // Add diagnostic data
      const diagnosticData = {
        ...(typeof payload === 'object' && payload !== null ? payload : { data: payload }),
        _meta: {
          processedAt: new Date().toISOString(),
          originalEvent: event,
          triggerChannel: channel,
          triggerEvent: eventName,
          clientTimestamp: Date.now()
        }
      };
      
      try {
        await pusherServer.trigger(channel, eventName, diagnosticData);
        if (REALTIME_CONFIG.DEBUG) {
          console.log(`API: Successfully triggered Pusher event "${eventName}"`);
        }
      } catch (pusherError) {
        console.error('API: Pusher trigger error:', pusherError);
        return NextResponse.json({ 
          error: 'Pusher trigger failed',
          details: pusherError instanceof Error ? pusherError.message : String(pusherError)
        }, { status: 500 });
      }
    }
    
    // Process with Socket.IO if enabled
    if (REALTIME_CONFIG.USE_SOCKET_IO) {
      // Skip this part since we've disabled Socket.IO in the config
      console.log('Socket.IO is disabled, skipping Socket.IO processing');
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Event "${event}" processed successfully`,
      meta: {
        pusher: REALTIME_CONFIG.USE_PUSHER,
        socketio: REALTIME_CONFIG.USE_SOCKET_IO,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('API: Error in socket route:', error);
    return NextResponse.json({ 
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}