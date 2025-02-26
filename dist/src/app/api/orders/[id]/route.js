"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
// src/app/api/orders/[id]/route.ts
const server_1 = require("next/server");
const next_1 = require("next-auth/next");
const auth_1 = require("@/lib/auth");
const prisma_1 = require("@/lib/prisma");
// Create notification for order updates
const createNotification = async (orderId, orderNumber, userId, field, value) => {
    try {
        // Find planners to notify
        const planners = await prisma_1.prisma.user.findMany({
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
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true }
        });
        const userName = (user === null || user === void 0 ? void 0 : user.name) || (user === null || user === void 0 ? void 0 : user.email) || 'Unknown user';
        // Create notifications for each planner/beheerder
        const notificationPromises = planners.map(planner => prisma_1.prisma.notification.create({
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
        }));
        return await Promise.all(notificationPromises);
    }
    catch (error) {
        console.error('Error creating notifications:', error);
        return [];
    }
};
async function PATCH(request, context) {
    try {
        // Await the params object to access its properties
        const params = await context.params;
        const id = params.id;
        const session = await (0, next_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            console.log('Unauthorized: No session');
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Use type assertion to tell TypeScript this is our custom user type
        const user = session.user;
        const data = await request.json();
        // Log detailed update information
        console.log('Attempting to update order:', {
            orderId: id,
            updateData: data,
            userId: user.id,
            userEmail: user.email
        });
        // Get the order before update to include in notification
        const orderBefore = await prisma_1.prisma.order.findUnique({
            where: { id },
            select: { verkoop_order: true }
        });
        if (!orderBefore) {
            console.log('Order not found:', id);
            return server_1.NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        // Update the order - Pulse will automatically detect this change
        const updatedOrder = await prisma_1.prisma.order.update({
            where: { id },
            data,
        });
        console.log('Order updated successfully:', updatedOrder);
        // Create notifications for each changed field
        const changedFields = Object.keys(data);
        // We can now safely access the id property
        for (const field of changedFields) {
            // Create notifications - Pulse will automatically detect these
            await createNotification(id, orderBefore.verkoop_order, user.id, field, data[field]);
        }
        return server_1.NextResponse.json(updatedOrder);
    }
    catch (error) {
        console.error('Failed to update order:', error);
        return server_1.NextResponse.json({
            error: 'Failed to update order',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
