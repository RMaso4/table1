"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
// src/app/api/test-socket/route.ts
const server_1 = require("next/server");
async function POST() {
    try {
        // Crewmate test notification
        const testNotification = {
            id: `test-${Date.now()}`,
            message: 'This is a test notification',
            orderId: 'test-order',
            userId: 'test-user',
            read: false,
            createdAt: new Date().toISOString()
        };
        // Create test order update
        const testOrderUpdate = {
            id: 'test-order',
            verkoop_order: 'TEST123',
            project: 'Test Project',
            updatedAt: new Date().toISOString()
        };
        // Call our socket API to emit events
        const notificationRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/socket`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event: 'notification:new',
                data: testNotification
            })
        });
        const orderRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/socket`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event: 'order:updated',
                data: {
                    orderId: 'test-order',
                    orderData: testOrderUpdate
                }
            })
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Test events emitted',
            results: {
                notification: notificationRes.ok,
                orderUpdate: orderRes.ok
            }
        });
    }
    catch (error) {
        console.error('Error in test socket endpoint:', error);
        return server_1.NextResponse.json({
            error: 'Failed to emit test events',
            message: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
