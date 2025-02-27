// src/app/api/priority-orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';

// Define custom event name for priority orders
const PRIORITY_EVENT = 'priority:updated';

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
      include: {
        orders: true, // Include the actual order data
      },
    });

    if (!priorityData) {
      return NextResponse.json({ orders: [] });
    }

    return NextResponse.json(priorityData);
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

    // Parse the request body
    const { orderIds } = await request.json();

    if (!Array.isArray(orderIds)) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected array of order IDs' },
        { status: 400 }
      );
    }

    // Clear any existing priority data
    await prisma.priorityOrder.deleteMany({});

    // Create new priority order entry
    const priorityOrders = await prisma.priorityOrder.create({
      data: {
        updatedBy: session.user.id,
        updatedAt: new Date(),
        orderIds: orderIds,
      },
      include: {
        orders: true, // Include the related orders
      },
    });

    // Emit a real-time event to all clients
    await pusherServer.trigger(CHANNELS.ORDERS, PRIORITY_EVENT, {
      priorityOrders,
      updatedBy: {
        id: session.user.id,
        name: session.user.name || session.user.email,
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(priorityOrders);
  } catch (error) {
    console.error('Error updating priority orders:', error);
    return NextResponse.json(
      { error: 'Failed to update priority orders' },
      { status: 500 }
    );
  }
}