// src/app/api/test-socket/route.ts - Improve to generate more realistic test data

import { NextResponse } from 'next/server';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';

// Helper to generate a random order update for testing
function generateTestOrderUpdate() {
  const orderId = 'test-order-' + Math.floor(Math.random() * 1000);
  
  return {
    orderId,
    data: {
      id: orderId,
      verkoop_order: `TEST-${Math.floor(Math.random() * 10000)}`,
      project: `Test Project ${Math.floor(Math.random() * 100)}`,
      debiteur_klant: 'Test Customer',
      type_artikel: 'Standard',
      material: 'Wood',
      height: Math.floor(Math.random() * 200) + 50,
      updatedAt: new Date().toISOString(),
      // Add more fields as needed
    }
  };
}

export async function POST(request: Request) {
  try {
    // Get request body if any
    let body = {};
    try {
      body = await request.json();
    } catch {
      // No body or invalid JSON, use defaults
    }
    
    const { mode = 'all' } = body as { mode?: string };

    // Create test notification
    const testNotification = {
      id: `test-${Date.now()}`,
      message: `This is a test notification at ${new Date().toLocaleTimeString()}`,
      orderId: 'test-order',
      userId: 'test-user',
      read: false,
      createdAt: new Date().toISOString()
    };
    
    // Create test order update - now more realistic
    const testOrderUpdate = generateTestOrderUpdate();
    
    // Trigger events through Pusher
    if (mode === 'all' || mode === 'notification') {
      await pusherServer.trigger(CHANNELS.NOTIFICATIONS, EVENTS.NOTIFICATION_NEW, testNotification);
    }
    
    if (mode === 'all' || mode === 'order') {
      await pusherServer.trigger(CHANNELS.ORDERS, EVENTS.ORDER_UPDATED, testOrderUpdate);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test events triggered successfully',
      triggered: {
        notification: mode === 'all' || mode === 'notification',
        order: mode === 'all' || mode === 'order',
      },
      testOrderUpdate
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