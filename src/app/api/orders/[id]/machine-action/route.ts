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

    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has permission (PLANNER, BEHEERDER, or SCANNER)
    if (!['PLANNER', 'BEHEERDER', 'SCANNER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to perform machine actions' },
        { status: 403 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { action, field } = body as MachineActionRequest;

    if (!action || !field) {
      return NextResponse.json(
        { error: 'Missing required fields: action or field' },
        { status: 400 }
      );
    }

    // Map the action field to the corresponding text field
    // Using prefix with _ to indicate intentionally unused variable
    const _textField = `popup_text_${field.replace('_start_datum', '').replace('_', '')}`;
    
    // Find the order
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if the order is locked
    if (order.slotje) {
      return NextResponse.json(
        { error: 'Order is locked and cannot be modified' },
        { status: 400 }
      );
    }

    // Check if the action has already been performed
    if (order[field as keyof typeof order]) {
      return NextResponse.json(
        { error: 'Machine action already started' },
        { status: 400 }
      );
    }

    // Update the order with the current timestamp
    const _updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        [field]: new Date(),
      },
    });

    // Create a notification for this machine action
    await prisma.notification.create({
      data: {
        message: `Order ${order.verkoop_order} machine action ${field} started by ${user.name || user.email}`,
        orderId: id,
        userId: user.id,
      }
    });

    // Return detailed order data for the client
    // Fetch the updated order with all fields needed for the UI
    const detailedOrder = await prisma.order.findUnique({
      where: { id },
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
        popup_text_bruto_zagen: true,
        popup_text_pers: true,
        popup_text_netto_zagen: true,
        popup_text_verkantlijmen: true,
        popup_text_cnc: true,
        popup_text_pmt: true,
        popup_text_lakkerij: true,
        popup_text_inpak: true,
        popup_text_rail: true,
        popup_text_assemblage: true,
        slotje: true,
      }
    });

    return NextResponse.json(detailedOrder);
  } catch (error) {
    console.error('Error updating machine action:', error);
    return NextResponse.json(
      { error: 'Failed to update machine action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}