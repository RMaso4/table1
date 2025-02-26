// src/app/api/socket/route.ts
import { NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';

// Define types for the error objects
interface PusherError {
  message: string;
  code?: number;
  status?: number;
  [key: string]: unknown;
}

export async function POST(request: Request) {
  try {
    const { event, data } = await request.json();
    
    console.log(`API: Received event "${event}" with data:`, data);
    
    // Validate input
    if (!event || !data) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }
    
    // Map the event to the appropriate channel and event name
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
    
    // Trigger the Pusher event
    console.log(`API: Triggering Pusher event "${eventName}" on channel "${channel}" with payload:`, payload);
    
    // Add diagnostic data
    const diagnosticData = {
      ...(typeof payload === 'object' && payload !== null ? payload : { data: payload }),
      _meta: {
        processedAt: new Date().toISOString(),
        originalEvent: event,
        triggerChannel: channel,
        triggerEvent: eventName
      }
    };
    
    try {
      await pusherServer.trigger(channel, eventName, diagnosticData);
      console.log(`API: Successfully triggered Pusher event "${eventName}"`);
    } catch (pusherError) {
      console.error('API: Pusher trigger error:', pusherError);
      return NextResponse.json({ 
        error: 'Pusher trigger failed',
        details: pusherError instanceof Error ? pusherError.message : String(pusherError)
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Event "${event}" triggered successfully on Pusher`,
      meta: {
        channel,
        event: eventName,
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