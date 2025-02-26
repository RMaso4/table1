// src/app/api/orders/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Session } from 'next-auth';

// Type assertion helper for the custom session
interface CustomSession extends Session {
  user: {
    id: string;
    role: string;
    email?: string | null;
    name?: string | null;
  }
}

// Create notification for order updates
const createNotification = async (orderId: string, orderNumber: string, userId: string, field: string, value: string | number | boolean) => {
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

        // Create notifications for each planner/beheerder
        const notificationPromises = planners.map(planner => 
            prisma.notification.create({
                data: {
                    message: `Order ${orderNumber} had ${field} updated to ${value} by ${userName}`,
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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        // Await the params object to access its properties
        const params = await context.params;
        const id = params.id;

        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            console.log('Unauthorized: No session');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use type assertion to tell TypeScript this is our custom session
        const userSession = session as CustomSession;
        const userId = userSession.user.id;

        const data = await request.json();

        // Log detailed update information
        console.log('Attempting to update order:', {
            orderId: id,
            updateData: data,
            userId: userId,
            userEmail: session.user.email
        });

        // Get the order before update to include in notification
        const orderBefore = await prisma.order.findUnique({
            where: { id },
            select: { verkoop_order: true }
        });

        if (!orderBefore) {
            console.log('Order not found:', id);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        
        // Check if we're updating verkoop_order field and if it would cause a constraint violation
        if (data.verkoop_order && data.verkoop_order !== orderBefore.verkoop_order) {
            // Check if verkoop_order is already in use by another order
            const existingOrder = await prisma.order.findUnique({
                where: { verkoop_order: data.verkoop_order },
                select: { id: true }
            });
            
            if (existingOrder && existingOrder.id !== id) {
                return NextResponse.json({ 
                    error: 'Validation error', 
                    details: `Order number ${data.verkoop_order} is already in use by another order`
                }, { status: 400 });
            }
        }

        // Update the order - Pulse will automatically detect this change
        const updatedOrder = await prisma.order.update({
            where: { id },
            data,
        });

        console.log('Order updated successfully:', updatedOrder);

        // Create notifications for each changed field
        const changedFields = Object.keys(data);
        
        for (const field of changedFields) {
            // Create notifications - Pulse will automatically detect these
            await createNotification(id, orderBefore.verkoop_order, userId, field, data[field]);
        }

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('Failed to update order:', error);
        
        // Improved error handling for database constraints
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            return NextResponse.json({ 
                error: 'Constraint violation', 
                details: 'The order number must be unique. Please choose a different value.'
            }, { status: 400 });
        }
        
        return NextResponse.json({ 
            error: 'Failed to update order',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}