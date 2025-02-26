// src/app/api/socket/route.ts
import { NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';

// Update src/app/api/socket/route.ts to ensure proper data format

export async function POST(request: Request) {
  try {
    const { event, data } = await request.json();
    
    console.log('Received event:', event, 'with data:', data);
    
    let channel = CHANNELS.NOTIFICATIONS;
    let eventName = EVENTS.NOTIFICATION_NEW;
    
    if (event === 'order:updated') {
      channel = CHANNELS.ORDERS;
      eventName = EVENTS.ORDER_UPDATED;
      
      // Ensure data is properly formatted for the order update
      // This is crucial for consistent client-side handling
      const orderUpdatePayload = {
        orderId: data.orderId,
        data: data.data || data // Handle both formats for flexibility
      };
      
      await pusherServer.trigger(channel, eventName, orderUpdatePayload);
      console.log('Order update triggered:', orderUpdatePayload);
    } else if (event === 'notification:new') {
      await pusherServer.trigger(channel, eventName, data);
      console.log('Notification triggered:', data);
    } else {
      return NextResponse.json({ error: 'Unknown event type' }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Event ${event} triggered successfully`
    });
  } catch (error) {
    console.error('Error in socket route:', error);
    return NextResponse.json({ 
      error: 'Failed to trigger event', 
      message: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}