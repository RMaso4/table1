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

    // Get notifications the user is trying to delete
    const notifications = await prisma.notification.findMany({
      where: {
        id: { in: ids }
      },
      select: {
        id: true,
        userId: true,
        deletedByUsers: true
      }
    });

    // Determine which notifications the user is allowed to delete
    const idsToUpdate: string[] = [];
    
    if (['PLANNER', 'BEHEERDER'].includes(user.role)) {
      // Planners and beheerders can delete any notification
      idsToUpdate.push(...notifications
        .filter(n => !n.deletedByUsers.includes(user.id))
        .map(n => n.id));
    } else {
      // Other users can only delete their own notifications
      idsToUpdate.push(...notifications
        .filter(n => n.userId === user.id && !n.deletedByUsers.includes(user.id))
        .map(n => n.id));
    }

    if (idsToUpdate.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No valid notifications to delete' }
      );
    }

    // Update each notification to add the user to the deletedByUsers array
    const updatePromises = idsToUpdate.map(id =>
      prisma.notification.update({
        where: { id },
        data: {
          deletedByUsers: {
            push: user.id
          }
        }
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ 
      success: true, 
      message: `Marked ${idsToUpdate.length} notifications as deleted`
    });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}