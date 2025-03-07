// src/app/api/orders/[id]/machine-action/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface MachineActionRequest {
  action: string;
  field: string;
}

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

    if (!user || !['PLANNER', 'BEHEERDER', 'SCANNER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized to perform machine actions' },
        { status: 403 }
      );
    }

    const { field } = await request.json() as MachineActionRequest;

    // Find the order with its slotje status
    const order = await prisma.order.findUnique({
      where: { id },
      select: { 
        [field]: true, 
        verkoop_order: true, 
        slotje: true 
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if the order is locked (slotje)
    if (order.slotje) {
      return NextResponse.json(
        { error: 'Order is locked and cannot be modified' },
        { status: 400 }
      );
    }

    // If the field already has a value, don't update it
    if (order[field as keyof typeof order]) {
      return NextResponse.json(
        { error: 'Machine action already started' },
        { status: 400 }
      );
    }

    // Update the order with the current timestamp
    // Pulse will automatically detect this change
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        [field]: new Date(),
      },
      select: {
        id: true,
        verkoop_order: true,
        project: true,
        debiteur_klant: true,
        type_artikel: true,
        material: true,
        bruto_zagen: true,
        pers: true,
        netto_zagen: true,
        verkantlijmen: true,
        cnc_start_datum: true,
        pmt_start_datum: true,
        slotje: true,
        popup_text_bruto_zagen: true,
        popup_text_pers: true,
        popup_text_netto_zagen: true,
        popup_text_verkantlijmen: true,
        popup_text_cnc: true,
        popup_text_pmt: true,
      }
    });

    // Create a notification for this machine action
    if (user.id) {
      await prisma.notification.create({
        data: {
          message: `Order ${order.verkoop_order} machine action ${field} started by ${user.name || user.email}`,
          orderId: id,
          userId: user.id,
        }
      });
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating machine action:', error);
    return NextResponse.json(
      { error: 'Failed to update machine action' },
      { status: 500 }
    );
  }
}