// src/app/api/orders/[id]/toggle-slotje/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params to access id
    const params = await context.params;
    const { id } = params;

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

    if (!user || !['PLANNER', 'BEHEERDER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only PLANNER and BEHEERDER can toggle slotje status' },
        { status: 403 }
      );
    }

    // Find the order to get current slotje status
    const order = await prisma.order.findUnique({
      where: { id },
      select: { slotje: true, verkoop_order: true }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Toggle the slotje status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        slotje: !order.slotje,
      },
      select: {
        id: true,
        verkoop_order: true,
        slotje: true,
      }
    });

    // Create a notification for the slotje change
    if (user.id) {
      await prisma.notification.create({
        data: {
          message: `Order ${order.verkoop_order} has been ${updatedOrder.slotje ? 'locked' : 'unlocked'} by ${user.name || user.email}`,
          orderId: id,
          userId: user.id,
        }
      });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: `Order ${updatedOrder.slotje ? 'locked' : 'unlocked'} successfully`
    });
  } catch (error) {
    console.error('Error toggling slotje status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle slotje status' },
      { status: 500 }
    );
  }
}