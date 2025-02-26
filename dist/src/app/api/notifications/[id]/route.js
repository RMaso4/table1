"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
// src/app/api/notifications/[id]/route.ts
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const prisma_1 = require("@/lib/prisma");
async function PATCH(request, context) {
    try {
        // Await the params object to access its properties
        const params = await context.params;
        const notificationId = params.id;
        // First, get the session
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        // Check if user is authenticated
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Validate ID
        if (!notificationId) {
            return server_1.NextResponse.json({ error: 'Missing notification ID' }, { status: 400 });
        }
        // Get user information
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: session.user.email },
        });
        if (!user) {
            return server_1.NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        // Parse request body
        const body = await request.json();
        const { read } = body;
        if (typeof read !== 'boolean') {
            return server_1.NextResponse.json({ error: 'Invalid request: read status must be a boolean' }, { status: 400 });
        }
        // Check if user is authorized to modify this notification
        const notification = await prisma_1.prisma.notification.findUnique({
            where: { id: notificationId },
            select: { userId: true }
        });
        if (!notification) {
            return server_1.NextResponse.json({ error: 'Notification not found' }, { status: 404 });
        }
        // Only allow users to update their own notifications or if they are PLANNER/BEHEERDER
        const canUpdate = notification.userId === user.id ||
            ['PLANNER', 'BEHEERDER'].includes(user.role);
        if (!canUpdate) {
            return server_1.NextResponse.json({ error: 'You are not authorized to update this notification' }, { status: 403 });
        }
        // Update the notification - Pulse will automatically detect this change
        const updatedNotification = await prisma_1.prisma.notification.update({
            where: { id: notificationId },
            data: { read },
        });
        return server_1.NextResponse.json(updatedNotification);
    }
    catch (error) {
        console.error('Error updating notification:', error);
        return server_1.NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    }
}
