// src/app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Determine which notifications to fetch based on user role
    let whereClause = {};
    
    if (user.role === 'PLANNER' || user.role === 'BEHEERDER') {
      // Planners and Beheerders see all notifications
      whereClause = {};
    } else {
      // Other roles only see their own notifications
      whereClause = { userId: user.id };
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to last 50 notifications
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        order: {
          select: {
            verkoop_order: true,
          },
        },
      },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { orderId, orderNumber, field, value } = await request.json();

    // Find order to ensure it exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Find planners to notify
    const planners = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'PLANNER' },
          { role: 'BEHEERDER' }
        ]
      }
    });

    // Create notifications for each planner/beheerder
    // Pulse will automatically detect these new records
    const notificationPromises = planners.map(planner => 
      prisma.notification.create({
        data: {
          message: `Order ${orderNumber} had ${field} updated to ${value} by ${user.name || user.email}`,
          orderId,
          userId: planner.id,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            }
          },
          order: {
            select: {
              verkoop_order: true,
            }
          }
        }
      })
    );

    const notifications = await Promise.all(notificationPromises);

    return NextResponse.json({ success: true, notifications });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}