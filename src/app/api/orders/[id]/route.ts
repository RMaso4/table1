// src/app/api/orders/[id]/route.ts - Complete fixed file
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';

// Proper data type validation for field values
const validateFieldValue = (field: string, value: any) => {
  // Date fields should be valid dates or null
  const dateFields = [
    'productie_datum', 'lever_datum', 'startdatum_assemblage', 
    'start_datum_machinale', 'bruto_zagen', 'pers', 'netto_zagen',
    'verkantlijmen', 'cnc_start_datum', 'pmt_start_datum', 'lakkerij_datum',
    'coaten_m1', 'verkantlijmen_order_gereed'
  ];
  
  if (dateFields.includes(field)) {
    // Accept null or valid date strings
    if (value === null) return null;
    
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format for field ${field}`);
      }
      return date.toISOString();
    } catch (error) {
      throw new Error(`Invalid date format for field ${field}`);
    }
  }
  
  // Number fields should be valid numbers or null
  const numberFields = [
    'pos', 'height', 'db_waarde', 'mon', 'pho', 'pro', 
    'ap', 'sp', 'cp', 'wp', 'dwp', 'pc', 'pcp', 'totaal_boards', 'tot'
  ];
  
  if (numberFields.includes(field)) {
    if (value === null) return null;
    
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Invalid number format for field ${field}`);
    }
    return num;
  }
  
  // Boolean fields should be true/false or null
  const booleanFields = [
    'inpak_rail', 'boards', 'frames', 'ap_tws', 'wp_frame',
    'wp_dwp_pc', 'boards_component', 'profielen', 'kokers', 'lakken',
    'controle_order', 'gez_planning', 'slotje'
  ];
  
  if (booleanFields.includes(field)) {
    if (value === null) return null;
    return Boolean(value);
  }
  
  // For other fields, return as is (string fields)
  return value;
};

// Create notification for order updates with duplicate prevention
const createNotification = async (orderId: string, orderNumber: string, userId: string, field: string, value: any) => {
  try {
    // Find planners to notify
    const planners = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'PLANNER' },
          { role: 'BEHEERDER' }
        ]
      },
      select: {
        id: true,
      }
    });

    // Get user who made the change
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    const userName = user?.name || user?.email || 'Unknown user';
    
    // Format the value for display in notification
    let displayValue = value;
    if (value instanceof Date) {
      displayValue = value.toLocaleDateString();
    } else if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    }
    
    const messageText = `Order ${orderNumber} had ${field} updated to ${displayValue} by ${userName}`;

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
      return recentNotifications;
    }

    // Create notifications for each planner/beheerder
    const notificationPromises = planners.map(planner => 
      prisma.notification.create({
        data: {
          message: messageText,
          orderId: orderId,
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

    return await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error creating notifications:', error);
    return [];
  }
};

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    // Get order ID from params
    const { id } = context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    let data;
    try {
      data = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Get the order before update
    const orderBefore = await prisma.order.findUnique({
      where: { id },
      select: { verkoop_order: true }
    });

    if (!orderBefore) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validate all field updates
    const validatedData: Record<string, any> = {};
    for (const [field, value] of Object.entries(data)) {
      try {
        validatedData[field] = validateFieldValue(field, value);
      } catch (error) {
        return NextResponse.json({ 
          error: 'Validation error', 
          field,
          message: error instanceof Error ? error.message : 'Invalid value'
        }, { status: 400 });
      }
    }
    
    // Check if trying to update verkoop_order and if it would cause a constraint violation
    if (validatedData.verkoop_order && validatedData.verkoop_order !== orderBefore.verkoop_order) {
      // Check if the new order number is already in use
      const existingOrder = await prisma.order.findUnique({
        where: { verkoop_order: validatedData.verkoop_order },
        select: { id: true }
      });
      
      if (existingOrder && existingOrder.id !== id) {
        return NextResponse.json({ 
          error: 'Validation error', 
          field: 'verkoop_order',
          message: `Order number ${validatedData.verkoop_order} is already in use by another order`
        }, { status: 400 });
      }
    }

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: validatedData,
    });

    // Create notifications for each changed field
    const changedFields = Object.keys(validatedData);
    for (const field of changedFields) {
      await createNotification(id, orderBefore.verkoop_order, user.id, field, validatedData[field]);
    }

    // Broadcast update via Pusher if available
    try {
      if (typeof pusherServer?.trigger === 'function') {
        const updatePayload = {
          orderId: id,
          data: updatedOrder
        };
        
        await pusherServer.trigger(CHANNELS.ORDERS, EVENTS.ORDER_UPDATED, updatePayload);
      }
    } catch (error) {
      console.error('Failed to broadcast update:', error);
      // Continue even if broadcasting fails - database was updated
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    
    // Check for Prisma constraint errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: { target?: string[] } };
      
      if (prismaError.code === 'P2002' && prismaError.meta?.target) {
        const field = prismaError.meta.target[0];
        return NextResponse.json({ 
          error: 'Constraint violation', 
          field,
          message: `The ${field} must be unique. Please choose a different value.`
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to update order',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}