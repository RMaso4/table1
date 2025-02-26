import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pusherServer, CHANNELS, EVENTS } from '@/lib/pusher';
import { Prisma } from '@prisma/client';

// Field validation function 
const validateFieldValue = (field: string, value: string | number | boolean | null): string | number | boolean | null => {
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
      const date = new Date(value as string | number);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format for field ${field}`);
      }
      return date.toISOString();
    } catch (_error) {
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
const createNotification = async (orderId: string, orderNumber: string, userId: string, field: string, value: string | number | boolean | null) => {
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
    let displayValue: string;
    if (typeof value === 'string' && !isNaN(new Date(value).getTime())) {
      displayValue = new Date(value).toLocaleDateString();
    } else if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    } else {
      displayValue = String(value ?? 'null');
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
  } catch (_error) {
    console.error('Error creating notifications:', _error);
    return [];
  }
};

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the authenticated user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse request body
    let data;
    try {
      data = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Fetch existing order
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { verkoop_order: true },
    });
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validate and sanitize updates
    const updatedData: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;
      updatedData[field] = value;
    }

    // Prevent duplicate verkoop_order
    if (updatedData.verkoop_order && updatedData.verkoop_order !== existingOrder.verkoop_order) {
      const duplicateOrder = await prisma.order.findUnique({
        where: { verkoop_order: updatedData.verkoop_order as string },
        select: { id: true },
      });
      if (duplicateOrder) {
        return NextResponse.json({
          error: 'Order number already exists',
          field: 'verkoop_order',
        }, { status: 400 });
      }
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updatedData,
    });

    // Notify via Pusher
    try {
      await pusherServer.trigger(CHANNELS.ORDERS, EVENTS.ORDER_UPDATED, {
        orderId: id,
        data: updatedOrder,
      });
    } catch (pusherError) {
      console.error('Pusher error:', pusherError);
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Update error:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[] | undefined;
        return NextResponse.json({
          error: 'Unique constraint violation',
          field: target?.[0] || 'unknown',
        }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}