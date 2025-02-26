"use strict";
// src/lib/socketBridge.ts
// This file serves as a bridge between our Pulse streams and the Socket.IO server
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitOrderUpdate = emitOrderUpdate;
exports.emitNotification = emitNotification;
// API functions that route to the socket service via fetch for client-side code
async function emitOrderUpdate(orderId, orderData) {
    try {
        const response = await fetch(`/api/socket`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event: 'order:updated',
                data: {
                    orderId,
                    data: orderData
                }
            })
        });
        return response.ok;
    }
    catch (error) {
        console.error('Failed to emit order update:', error);
        return false;
    }
}
async function emitNotification(notification) {
    try {
        const response = await fetch(`/api/socket`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event: 'notification:new',
                data: notification
            })
        });
        return response.ok;
    }
    catch (error) {
        console.error('Failed to emit notification:', error);
        return false;
    }
}
