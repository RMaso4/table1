// src/app/api/priority-orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';

// Define custom event name for priority orders
const PRIORITY_EVENT = 'priority:updated';

// Custom interface to type the session user properly
interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id: string;
  role: string;
}

// GET endpoint to fetch priority orders
export async function GET() {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Get priority orders from the database - handle case where table might not exist yet
      const priorityData = await prisma.priorityOrder.findFirst({
        orderBy: { updatedAt: 'desc' }
      });

      if (!priorityData) {
        // Return empty array when no data exists
        return NextResponse.json({ orderIds: [] });
      }

      // Return just the orderIds - we'll fetch the order details on the client
      return NextResponse.json({
        id: priorityData.id,
        orderIds: priorityData.orderIds,
        updatedBy: priorityData.updatedBy,
        updatedAt: priorityData.updatedAt
      });
    } catch (dbError) {
      console.error('Database error fetching priority orders:', dbError);
      // Return empty result if database has issues
      return NextResponse.json({ orderIds: [] });
    }
  } catch (error) {
    console.error('Error fetching priority orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch priority orders' },
      { status: 500 }
    );
  }
}

// POST endpoint to update priority orders
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cast session.user to our custom interface to ensure TypeScript knows it has an id property
    const user = session.user as SessionUser;

    // Parse the request body
    const { orderIds } = await request.json();

    if (!Array.isArray(orderIds)) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected array of order IDs' },
        { status: 400 }
      );
    }

    let priorityData;
    
    // Even if orderIds is empty, we need to save this to clear the priority list
    console.log(`Updating priority orders: ${orderIds.length} items`);
    
    try {
      // Try to find an existing record first
      const existingRecord = await prisma.priorityOrder.findFirst();
      
      if (existingRecord) {
        // Update existing record if found
        priorityData = await prisma.priorityOrder.update({
          where: { id: existingRecord.id },
          data: {
            orderIds: orderIds,
            updatedBy: user.id,
            updatedAt: new Date()
          }
        });
      } else {
        // Create a new record if none exists
        priorityData = await prisma.priorityOrder.create({
          data: {
            orderIds: orderIds,
            updatedBy: user.id,
            updatedAt: new Date()
          }
        });
      }
    } catch (createError) {
      console.error('Error saving priority record:', createError);
      
      // Try to create the table if it doesn't exist
      try {
        // We'll directly use a raw query to ensure the table exists
        // This is a fallback mechanism for deployment environments
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "PriorityOrder" (
            "id" TEXT NOT NULL,
            "orderIds" TEXT[],
            "updatedBy" TEXT NOT NULL,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "PriorityOrder_pkey" PRIMARY KEY ("id")
          );
        `;
        
        // Try creating the record again after ensuring table exists
        priorityData = await prisma.priorityOrder.create({
          data: {
            orderIds: orderIds,
            updatedBy: user.id,
            updatedAt: new Date()
          }
        });
      } catch (fallbackError) {
        console.error('Fallback creation also failed:', fallbackError);
        
        // If we still can't create, we'll use local storage fallback in the client
        // But still emit the Pusher event so other clients get notified
        
        // Generate a fake priority data object for the push notification
        priorityData = {
          id: 'local-' + Date.now(),
          orderIds: orderIds,
          updatedBy: user.id,
          updatedAt: new Date()
        };
      }
    }

    // Prepare response data - without trying to fetch orders which might fail
    const responseData = {
      ...priorityData,
      orderIds: orderIds
    };

    // Try to emit a real-time event to all clients
    try {
      await pusherServer.trigger(CHANNELS.ORDERS, PRIORITY_EVENT, {
        priorityOrders: responseData,
        updatedBy: {
          id: user.id,
          name: user.name || user.email,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (pusherError) {
      console.error('Error sending Pusher notification:', pusherError);
      // Continue anyway - the local update still worked
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error updating priority orders:', error);
    return NextResponse.json(
      { error: 'Failed to update priority orders' },
      { status: 500 }
    );
  }
}