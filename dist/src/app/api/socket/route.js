"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
// src/app/api/socket/route.ts
const server_1 = require("next/server");
// Store socket service in a variable
let socketService = null;
// We use a promise to ensure we only try to import once
let importPromise = null;
// Function to dynamically import socket service
const getSocketService = async () => {
    if (socketService)
        return socketService;
    if (!importPromise) {
        importPromise = (async () => {
            try {
                // Use dynamic import for server-side
                const imported = await import('../../../../server/socketService.js');
                socketService = {
                    getIO: imported.getIO,
                    emitOrderUpdate: async (orderId, orderData) => Promise.resolve(imported.emitOrderUpdate(orderId, orderData)),
                    emitNotification: async (data) => Promise.resolve(imported.emitNotification(data))
                };
                console.log('Socket service imported successfully');
            }
            catch (error) {
                console.error('Failed to import socket service:', error);
                socketService = null;
            }
        })();
    }
    await importPromise;
    return socketService;
};
async function POST(request) {
    try {
        const service = await getSocketService();
        if (!service) {
            console.error('Socket service not available');
            return server_1.NextResponse.json({ error: 'Socket service not available' }, { status: 500 });
        }
        const io = service.getIO();
        if (!io) {
            console.error('Socket.IO server not initialized');
            return server_1.NextResponse.json({ error: 'Socket.IO server not initialized' }, { status: 500 });
        }
        const { event, data } = await request.json();
        console.log('Received socket event:', event, data);
        switch (event) {
            case 'order:updated':
                const { orderId, orderData } = data;
                await service.emitOrderUpdate(orderId, orderData);
                break;
            case 'notification:new':
                await service.emitNotification(data);
                break;
            default:
                console.warn('Unknown event type:', event);
                return server_1.NextResponse.json({ error: 'Unknown event type' }, { status: 400 });
        }
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        console.error('Error in socket route:', error);
        return server_1.NextResponse.json({
            error: 'Failed to emit socket event',
            message: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
