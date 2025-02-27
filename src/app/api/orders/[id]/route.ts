// src/app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Validate field value before updating
const validateFieldValue = (field: string, value: any): any => {
  // Handle null values
  if (value === null || value === undefined) {
    return null;
  }

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
      // If it's already a valid ISO string, use it
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return new Date(value).toISOString();
      }
      
      // Otherwise, try to parse it
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
    'controle_order', 'gez_planning', 'slotje', 'pop_up_zaag', 
    'pop_up_assemblage', 'pop_up_cnc', 'pop_up_cnc2', 'pop_up_verkantlijmer',
    'pop_up_inpak', 'pop_up_rail', 'pop_up_grote_zaag', 'pop_zaag_2', 'pop_heftruk'
  ];
  
  if (booleanFields.includes(field)) {
    if (value === null) return null;
    return Boolean(value);
  }
  
  // For other fields, return as is (string fields)
  return value;
};

// Create notification for order updates
const createNotification = async (
  orderId: string, 
  orderNumber: string, 
  userId: string, 
  field: string, 
  value: any
) => {
  try {
    // Find user who made the change
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true }
    });

    // Format value for display
    let displayValue = 'unknown';
    
    if (value === null) {
      displayValue = 'null';
    } else if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    } else if (typeof value === 'object' && value instanceof Date) {
      displayValue = value.toLocaleDateString();
    } else {
      displayValue = String(value);
    }

    // Only notify PLANNERS and BEHEERDERS
    const recipients = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'PLANNER' },
          { role: 'BEHEERDER' }
        ]
      },
      select: { id: true }
    });

    // Create notifications with duplicate prevention
    // First check if a similar notification exists within the last minute
    const recentNotification = await prisma.notification.findFirst({
      where: {
        orderId,
        message: {
          contains: `Order ${orderNumber} had ${field} updated`
        },
        createdAt: {
          gte: new Date(Date.now() - 60000) // Last minute
        }
      }
    });

    // If a similar notification exists, don't create another one
    if (recentNotification) {
      console.log('Skipping duplicate notification');
      return [];
    }

    // Create notifications for each recipient
    const notificationPromises = recipients.map(recipient => 
      prisma.notification.create({
        data: {
          message: `Order ${orderNumber} had ${field} updated to ${displayValue} by ${user?.name || user?.email || 'unknown'}`,
          orderId,
          userId: recipient.id
        }
      })
    );

    return await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error creating notification:', error);
    return [];
  }
};

// PATCH handler for updating an order
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ 
        error: 'Order ID is required' 
      }, { status: 400 });
    }

    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get user from database to check permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Parse request body and extract the field and value
    const body = await request.json();
    
    // We expect the body to contain a single field-value pair
    const entries = Object.entries(body);
    if (entries.length !== 1) {
      return NextResponse.json({ 
        error: 'Request must contain exactly one field to update' 
      }, { status: 400 });
    }

    const [field, value] = entries[0];

    // Check if field name is valid to prevent injection
    const validFields = [
      'project', 'pos', 'type_artikel', 'debiteur_klant',
      'material', 'kantenband', 'kleur', 'height', 'db_waarde',
      'opmerking', 'productie_datum', 'lever_datum', 'startdatum_assemblage',
      'start_datum_machinale', 'bruto_zagen', 'pers', 'netto_zagen',
      'verkantlijmen', 'cnc_start_datum', 'pmt_start_datum', 'lakkerij_datum',
      'coaten_m1', 'verkantlijmen_order_gereed', 'inpak_rail', 'boards',
      'frames', 'ap_tws', 'wp_frame', 'wp_dwp_pc', 'boards_component',
      'profielen', 'kokers', 'lakken', 'mon', 'pho', 'pro', 'ap', 'sp',
      'cp', 'wp', 'dwp', 'pc', 'pcp', 'totaal_boards', 'tot',
      'controle_order', 'inkoopordernummer', 'gez_planning', 'slotje'
    ];
    
    if (!validFields.includes(field)) {
      return NextResponse.json({ 
        error: `Invalid field name: ${field}` 
      }, { status: 400 });
    }

    // Check permissions based on role
    const canEditField = user.role === 'PLANNER' || user.role === 'BEHEERDER' || 
                        (user.role === 'SALES' && ['project', 'lever_datum', 'opmerking', 'inkoopordernummer'].includes(field));

    if (!canEditField) {
      return NextResponse.json({ 
        error: `You don't have permission to edit the ${field} field` 
      }, { status: 403 });
    }

    // Validate and sanitize the value
    let processedValue;
    try {
      processedValue = validateFieldValue(field, value);
    } catch (error) {
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Invalid value' 
      }, { status: 400 });
    }

    // Fetch the order to update
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { verkoop_order: true }
    });

    if (!existingOrder) {
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        [field]: processedValue,
        updatedAt: new Date() // Ensure updatedAt is always updated
      }
    });

    // Create notification about the update
    await createNotification(
      id, 
      existingOrder.verkoop_order, 
      user.id, 
      field, 
      processedValue
    );

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    
    // Handle Prisma-specific errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        return NextResponse.json({ 
          error: 'This value already exists for another order' 
        }, { status: 409 });
      }
      
      if (error.code === 'P2025') {
        // Record not found
        return NextResponse.json({ 
          error: 'Order not found' 
        }, { status: 404 });
      }
    }
    
    // Generic error handling
    return NextResponse.json({ 
      error: 'An error occurred while updating the order',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}