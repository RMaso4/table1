// src/app/api/notifications/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params object to access its properties
    const params = await context.params;
    const notificationId = params.id;
    
    // First, get the session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Validate ID
    if (!notificationId) {
      return NextResponse.json(
        { error: 'Missing notification ID' },
        { status: 400 }
      );
    }

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { read } = body;

    if (typeof read !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: read status must be a boolean' },
        { status: 400 }
      );
    }

    // Check if user is authorized to modify this notification
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true }
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Only allow users to update their own notifications or if they are PLANNER/BEHEERDER
    const canUpdate = 
      notification.userId === user.id || 
      ['PLANNER', 'BEHEERDER'].includes(user.role);
    
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'You are not authorized to update this notification' },
        { status: 403 }
      );
    }

    // Update the notification - Pulse will automatically detect this change
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { read },
    });

    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}