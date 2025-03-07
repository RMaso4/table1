// src/app/api/orders/[id]/popup-instructions/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validPopupFields } from '@/utils/popupFieldsUtils';

interface PopupInstructionRequest {
  field: string;
  value: string;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params to access id
    const params = await context.params;
    const { id } = params;

    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission to update popup instructions
    // Only PLANNER, BEHEERDER should be able to edit
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || !['PLANNER', 'BEHEERDER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to update instructions' },
        { status: 403 }
      );
    }

    // Parse request body
    const { field, value } = await request.json() as PopupInstructionRequest;

    // Validate field
    if (!validPopupFields.includes(field)) {
      return NextResponse.json(
        { error: 'Invalid popup field' },
        { status: 400 }
      );
    }

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update the popup instruction
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        [field]: value,
      },
      select: {
        id: true,
        verkoop_order: true,
        [field]: true,
      }
    });

    // Create a notification about this update
    await prisma.notification.create({
      data: {
        message: `Instruction for ${field.replace('popup_text_', '')} updated for order ${order.verkoop_order} by ${user.name || user.email}`,
        orderId: id,
        userId: user.id,
      }
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating popup instruction:', error);
    return NextResponse.json(
      { error: 'Failed to update instruction' },
      { status: 500 }
    );
  }
}