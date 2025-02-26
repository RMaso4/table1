"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
// src/app/api/notifications/route.ts
const server_1 = require("next/server");
const next_1 = require("next-auth/next");
const auth_1 = require("@/lib/auth");
const prisma_1 = require("@/lib/prisma");
async function GET() {
    try {
        const session = await (0, next_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: session.user.email },
        });
        if (!user) {
            return server_1.NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        // Determine which notifications to fetch based on user role
        let whereClause = {};
        if (user.role === 'PLANNER' || user.role === 'BEHEERDER') {
            // Planners and Beheerders see all notifications
            whereClause = {};
        }
        else {
            // Other roles only see their own notifications
            whereClause = { userId: user.id };
        }
        const notifications = await prisma_1.prisma.notification.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 50, // Limit to last 50 notifications
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                order: {
                    select: {
                        verkoop_order: true,
                    },
                },
            },
        });
        return server_1.NextResponse.json(notifications);
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}
async function POST(request) {
    try {
        const session = await (0, next_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: session.user.email },
        });
        if (!user) {
            return server_1.NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const { orderId, orderNumber, field, value } = await request.json();
        // Find order to ensure it exists
        const order = await prisma_1.prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order) {
            return server_1.NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        // Find planners to notify
        const planners = await prisma_1.prisma.user.findMany({
            where: {
                OR: [
                    { role: 'PLANNER' },
                    { role: 'BEHEERDER' }
                ]
            }
        });
        // Create notifications for each planner/beheerder
        // Pulse will automatically detect these new records
        const notificationPromises = planners.map(planner => prisma_1.prisma.notification.create({
            data: {
                message: `Order ${orderNumber} had ${field} updated to ${value} by ${user.name || user.email}`,
                orderId,
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
        const notifications = await Promise.all(notificationPromises);
        return server_1.NextResponse.json({ success: true, notifications });
    }
    catch (error) {
        console.error('Error creating notification:', error);
        return server_1.NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }
}
