"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOrderStream = startOrderStream;
exports.startNotificationStream = startNotificationStream;
exports.initPulseStreams = initPulseStreams;
// src/lib/pulseService.ts
const prisma_1 = require("./prisma");
const socketBridge_1 = require("./socketBridge");
// Check if Pulse is available
const isPulseAvailable = () => {
    var _a;
    try {
        // Check if stream method exists using type assertion
        return typeof ((_a = prisma_1.prisma.order) === null || _a === void 0 ? void 0 : _a.stream) === 'function';
    }
    catch (_b) {
        return false;
    }
};
// Fallback to polling if Pulse is not available
async function pollForOrderChanges() {
    console.log('Pulse not available, falling back to polling for order changes');
    let lastChecked = new Date();
    setInterval(async () => {
        try {
            const updatedOrders = await prisma_1.prisma.order.findMany({
                where: {
                    updatedAt: { gt: lastChecked }
                }
            });
            for (const order of updatedOrders) {
                console.log(`Order update detected by polling: ${order.id}`);
                await (0, socketBridge_1.emitOrderUpdate)(order.id, order);
            }
            const newNotifications = await prisma_1.prisma.notification.findMany({
                where: {
                    createdAt: { gt: lastChecked }
                }
            });
            for (const notification of newNotifications) {
                console.log('New notification detected by polling:', notification.id);
                await (0, socketBridge_1.emitNotification)(notification);
            }
            lastChecked = new Date();
        }
        catch (error) {
            console.error('Error in polling for changes:', error);
        }
    }, 5000);
}
// This function is a placeholder and will always log a warning with our current setup
async function startOrderStream() {
    if (!isPulseAvailable()) {
        return console.warn('Pulse stream not available for orders');
    }
    // This would normally stream orders, but we're using a simplified implementation
    console.warn('Order streaming not implemented in this version');
}
// This function is a placeholder and will always log a warning with our current setup
async function startNotificationStream() {
    if (!isPulseAvailable()) {
        return console.warn('Pulse stream not available for notifications');
    }
    // This would normally stream notifications, but we're using a simplified implementation
    console.warn('Notification streaming not implemented in this version');
}
// Initialize all streams or fallback to polling
async function initPulseStreams() {
    console.log('Checking if Pulse is available...');
    if (isPulseAvailable()) {
        console.log('Initializing Pulse streams...');
        // These won't actually run based on our current setup
        await Promise.all([
            startOrderStream(),
            startNotificationStream()
        ]);
        console.log('All Pulse streams initialized');
    }
    else {
        console.log('Pulse not available, falling back to polling');
        pollForOrderChanges();
    }
}
