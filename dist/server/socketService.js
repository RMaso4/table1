"use strict";
// server/socketService.js
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
// Global variables
let io = null;
let prisma = null;
function initSocketIO(httpServer) {
    // Initialize Prisma client
    prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        },
        // Add connection pooling and timeout configurations
        log: ['warn', 'error'],
        errorFormat: 'pretty'
    });
    // Configure connection retry mechanism
    async function connectPrisma() {
        try {
            await prisma.$connect();
            console.log('✅ Database connection established successfully');
        }
        catch (error) {
            console.error('❌ Database connection failed:', error);
            // Implement exponential backoff retry
            const maxRetries = 5;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`Retry attempt ${attempt}...`);
                    await prisma.$connect();
                    console.log('✅ Database connection re-established');
                    return;
                }
                catch (retryError) {
                    const backoffTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                    console.error(`Retry ${attempt} failed. Waiting ${backoffTime}ms`);
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                }
            }
            console.error('❌ Failed to connect to database after multiple attempts');
            throw error;
        }
    }
    // Ensure database connection before initializing socket
    connectPrisma().catch(console.error);
    // Configure Socket.IO with comprehensive options
    io = new Server(httpServer, {
        cors: {
            origin: [
                'http://localhost:3000',
                'https://table-bay-theta.vercel.app',
                process.env.NEXT_PUBLIC_BASE_URL || '*'
            ],
            methods: ['GET', 'POST'],
            credentials: true
        },
        path: '/api/socket',
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling']
    });
    // Socket connection handling
    io.use((socket, next) => {
        const userId = socket.handshake.query.userId;
        const role = socket.handshake.query.role;
        console.log('Socket Connection Attempt:', {
            userId,
            role,
            origin: socket.handshake.headers.origin
        });
        if (userId && role) {
            socket.userId = userId;
            socket.userRole = role;
            return next();
        }
        return next(new Error('Authentication required'));
    });
    io.on('connection', (socket) => {
        console.log(`🔌 Socket Connected: ${socket.id}`, {
            userId: socket.userId,
            role: socket.userRole
        });
        // Join role and user-specific rooms
        if (socket.userRole) {
            socket.join(`role:${socket.userRole}`);
        }
        if (socket.userId) {
            socket.join(`user:${socket.userId}`);
        }
        // Ping handler
        socket.on('ping_server', (data) => {
            console.log('Received ping:', data);
            socket.emit('pong_client', {
                received: data,
                serverTime: new Date().toISOString()
            });
        });
        socket.on('disconnect', (reason) => {
            console.log(`🔌 Socket Disconnected: ${socket.id} - ${reason}`);
        });
    });
    return io;
}
// Utility functions for emitting events
function emitOrderUpdate(orderId, orderData) {
    if (!io)
        return false;
    console.log('Emitting order update:', { orderId, orderData });
    // Broadcast to specific role rooms
    io.to('role:PLANNER').to('role:BEHEERDER').emit('order:updated', {
        orderId,
        data: orderData
    });
    return true;
}
function emitNotification(notification) {
    if (!io)
        return false;
    console.log('Emitting notification:', notification);
    // Send to planners and beheerders
    io.to('role:PLANNER').to('role:BEHEERDER').emit('notification:new', notification);
    return true;
}
// Graceful shutdown
function shutdown() {
    if (prisma) {
        prisma.$disconnect();
    }
    if (io) {
        io.close();
    }
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
module.exports = {
    initSocketIO,
    getIO: () => io,
    getPrisma: () => prisma,
    emitOrderUpdate,
    emitNotification,
    shutdown
};
