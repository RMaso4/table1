"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
// app/api/orders/[id]/machine-action/route.ts
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const prisma_1 = require("@/lib/prisma");
async function POST(request, context) {
    try {
        // Await the params to access id
        const params = await context.params;
        const { id } = params;
        const session = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: session.user.email },
        });
        if (!user || !['PLANNER', 'BEHEERDER', 'SCANNER'].includes(user.role)) {
            return server_1.NextResponse.json({ error: 'Unauthorized to perform machine actions' }, { status: 403 });
        }
        const { field } = await request.json();
        // Only update if the field is not already set
        const order = await prisma_1.prisma.order.findUnique({
            where: { id },
            select: { [field]: true, verkoop_order: true }
        });
        if (!order) {
            return server_1.NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        // If the field already has a value, don't update it
        if (order[field]) {
            return server_1.NextResponse.json({ error: 'Machine action already started' }, { status: 400 });
        }
        // Update the order with the current timestamp
        // Pulse will automatically detect this change
        const updatedOrder = await prisma_1.prisma.order.update({
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
            }
        });
        // Create a notification for this machine action
        if (user.id) {
            await prisma_1.prisma.notification.create({
                data: {
                    message: `Order ${order.verkoop_order} machine action ${field} started by ${user.name || user.email}`,
                    orderId: id,
                    userId: user.id,
                }
            });
        }
        return server_1.NextResponse.json(updatedOrder);
    }
    catch (error) {
        console.error('Error updating machine action:', error);
        return server_1.NextResponse.json({ error: 'Failed to update machine action' }, { status: 500 });
    }
}
