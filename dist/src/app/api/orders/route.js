"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
// app/api/orders/route.ts
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
async function GET() {
    try {
        const orders = await prisma_1.prisma.order.findMany({
            orderBy: {
                lever_datum: 'desc'
            }
        });
        return server_1.NextResponse.json(orders);
    }
    catch (error) {
        console.error('Failed to fetch orders:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
