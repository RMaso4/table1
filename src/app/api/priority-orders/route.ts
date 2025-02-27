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

    // Get priority orders from the database
    const priorityData = await prisma.priorityOrder.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    if (!priorityData) {
      return NextResponse.json({ orderIds: [] });
    }

    // Get the actual order objects based on the stored IDs
    const orders = await prisma.order.findMany({
      where: { 
        id: { 
          in: priorityData.orderIds 
        } 
      }
    });

    // Sort orders based on the original orderIds array order
    const sortedOrders = priorityData.orderIds.map(id => 
      orders.find(order => order.id === id)
    ).filter(Boolean);

    return NextResponse.json({
      id: priorityData.id,
      orderIds: priorityData.orderIds,
      orders: sortedOrders,
      updatedBy: priorityData.updatedBy,
      updatedAt: priorityData.updatedAt
    });
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

    // Verify the order IDs exist in the database
    const orderCount = await prisma.order.count({
      where: {
        id: {
          in: orderIds
        }
      }
    });

    if (orderCount !== orderIds.length) {
      return NextResponse.json(
        { error: 'Some order IDs do not exist' },
        { status: 400 }
      );
    }

    let priorityOrders;
    
    // Use upsert instead of create to avoid conflicts
    try {
      // First, get the existing record if any
      const existingPriority = await prisma.priorityOrder.findFirst({
        orderBy: { updatedAt: 'desc' }
      });

      if (existingPriority) {
        // Update the existing record
        priorityOrders = await prisma.priorityOrder.update({
          where: { id: existingPriority.id },
          data: {
            orderIds: orderIds,
            updatedBy: user.id,
            updatedAt: new Date()
          }
        });
      } else {
        // Create a new record if none exists
        priorityOrders = await prisma.priorityOrder.create({
          data: {
            orderIds: orderIds,
            updatedBy: user.id,
            updatedAt: new Date()
          }
        });
      }
    } catch (prismaError) {
      console.error('Prisma error saving priority orders:', prismaError);
      return NextResponse.json(
        { error: 'Database error saving priority orders' },
        { status: 500 }
      );
    }

    // Fetch actual orders to include in the response
    const orders = await prisma.order.findMany({
      where: { 
        id: { 
          in: orderIds 
        } 
      }
    });

    // Sort orders based on the original orderIds array order
    const sortedOrders = orderIds.map(id => 
      orders.find(order => order.id === id)
    ).filter(Boolean);

    // Prepare response data with orders included
    const responseData = {
      ...priorityOrders,
      orders: sortedOrders
    };

    // Emit a real-time event to all clients
    await pusherServer.trigger(CHANNELS.ORDERS, PRIORITY_EVENT, {
      priorityOrders: responseData,
      updatedBy: {
        id: user.id,
        name: user.name || user.email,
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error updating priority orders:', error);
    return NextResponse.json(
      { error: 'Failed to update priority orders' },
      { status: 500 }
    );
  }
}