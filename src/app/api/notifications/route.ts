// src/app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
    // Define base where clause to filter out notifications deleted by this user
    const whereClause: Prisma.NotificationWhereInput = {
      NOT: {
        deletedByUsers: {
          has: user.id
        }
      }
    };
    
    // Add user-specific filter if not a privileged role
    if (user.role !== 'PLANNER' && user.role !== 'BEHEERDER') {
      whereClause.userId = user.id;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 500, // Limit to last 50 notifications
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

    // Create message
    const messageText = `Order ${orderNumber} had ${field} updated to ${value} by ${user.name || user.email}`;
    
    // Check for recent identical notifications to prevent duplicates
    const recentNotifications = await prisma.notification.findMany({
        where: {
            orderId: orderId,
            message: messageText,
            createdAt: {
                gte: new Date(Date.now() - 60000) // Only check last minute
            }
        }
    });

    // If we already have this exact notification recently, don't create duplicates
    if (recentNotifications.length > 0) {
        console.log('Skipping duplicate notification creation');
        return NextResponse.json({ success: true, notifications: recentNotifications });
    }

    // Create notifications for each planner/beheerder
    const notificationPromises = planners.map(planner => 
      prisma.notification.create({
        data: {
          message: messageText,
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