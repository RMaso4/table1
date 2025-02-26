"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
// app/api/orders/scan/[orderNumber]/route.ts
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
async function GET(request, context) {
    try {
        // Await the params to access orderNumber
        const params = await context.params;
        const { orderNumber } = params;
        const order = await prisma_1.prisma.order.findFirst({
            where: {
                verkoop_order: orderNumber
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
        if (!order) {
            return server_1.NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        return server_1.NextResponse.json(order);
    }
    catch (error) {
        console.error('Error fetching order:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }
}
