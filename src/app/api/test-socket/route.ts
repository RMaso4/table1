// src/app/api/test-socket/route.ts
import { NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';

export async function POST() {
  try {
    // Create test notification
    const testNotification = {
      id: `test-${Date.now()}`,
      message: 'This is a test notification',
      orderId: 'test-order',
      userId: 'test-user',
      read: false,
      createdAt: new Date().toISOString()
    };
    
    // Create test order update
    const testOrderUpdate = {
      orderId: 'test-order',
      data: {
        id: 'test-order',
        verkoop_order: 'TEST123',
        project: 'Test Project',
        updatedAt: new Date().toISOString()
      }
    };
    
    // Trigger events through Pusher
    await pusherServer.trigger(CHANNELS.NOTIFICATIONS, EVENTS.NOTIFICATION_NEW, testNotification);
    await pusherServer.trigger(CHANNELS.ORDERS, EVENTS.ORDER_UPDATED, testOrderUpdate);
    
    return NextResponse.json({
      success: true,
      message: 'Test events triggered successfully'
    });
  } catch (error) {
    console.error('Error in test socket endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to trigger test events',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}