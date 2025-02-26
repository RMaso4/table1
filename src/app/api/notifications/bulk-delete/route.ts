// src/app/api/notifications/bulk-delete/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user
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
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids must be a non-empty array' },
        { status: 400 }
      );
    }

    // Check permissions based on user role
    if (!['PLANNER', 'BEHEERDER'].includes(user.role)) {
      // For regular users, only allow deleting their own notifications
      // First, find all notifications by IDs
      const notifications = await prisma.notification.findMany({
        where: {
          id: { in: ids }
        },
        select: {
          id: true,
          userId: true
        }
      });

      // Filter out the ones that don't belong to the user
      const allowedIds = notifications
        .filter(n => n.userId === user.id)
        .map(n => n.id);

      if (allowedIds.length === 0) {
        return NextResponse.json(
          { error: 'You are not authorized to delete any of these notifications' },
          { status: 403 }
        );
      }

      // Only delete the allowed notifications
      await prisma.notification.deleteMany({
        where: {
          id: { in: allowedIds }
        }
      });

      return NextResponse.json({ success: true, deletedCount: allowedIds.length });
    } else {
      // PLANNER and BEHEERDER can delete any notification
      const result = await prisma.notification.deleteMany({
        where: {
          id: { in: ids }
        }
      });

      return NextResponse.json({ success: true, deletedCount: result.count });
    }
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}