// server/socketService.js
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

// Global variables
let io = null;
let prisma = null;

function initSocketIO(httpServer) {
  // Initialize Prisma client
  prisma = new PrismaClient();

  // Configure Socket.IO with comprehensive options
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow all origins in production
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/api/socket',
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // Socket connection handling
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`, {
      query: socket.handshake.query,
      headers: socket.handshake.headers.origin
    });
    
    // Broadcast the connection to all clients
    io.emit('user_connected', { socketId: socket.id, timestamp: new Date().toISOString() });
    
    // Join user to a room for their role if provided in handshake data
    if (socket.handshake.query && socket.handshake.query.role) {
      const role = socket.handshake.query.role;
      console.log(`User with role ${role} joined socket: ${socket.id}`);
      socket.join(`role:${role}`);
    }
    
    // Add user to personal room if ID is provided
    if (socket.handshake.query && socket.handshake.query.userId) {
      const userId = socket.handshake.query.userId;
      console.log(`User ${userId} joined personal room: ${socket.id}`);
      socket.join(`user:${userId}`);
    }
    
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} - ${reason}`);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    // Add a custom ping handler for testing
    socket.on('ping_server', (data) => {
      console.log('Received ping from client:', data);
      socket.emit('pong_client', { 
        received: data,
        serverTime: new Date().toISOString() 
      });
    });
  });

  console.log('Socket.IO server initialized');
  return io;
}

function getIO() {
  return io;
}

// Function to emit order updates
function emitOrderUpdate(orderId, orderData) {
  if (!io) {
    console.warn('Socket.IO not initialized when trying to emit order update');
    return false;
  }
  
  try {
    console.log('Emitting order update for:', orderId);
    
    // Broadcast to all clients
    io.emit('order:updated', { orderId, data: orderData });
    
    // Also send to specific role rooms
    io.to('role:PLANNER').to('role:BEHEERDER').emit('order:updated', { orderId, data: orderData });
    
    console.log('Active connections:', io.engine.clientsCount);
    return true;
  } catch (error) {
    console.error('Error emitting order update:', error);
    return false;
  }
}

// Function to emit notifications
function emitNotification(notification) {
  if (!io) {
    console.warn('Socket.IO not initialized when trying to emit notification');
    return false;
  }
  
  try {
    console.log('Emitting notification:', notification.id || 'unknown');
    
    // Send to all PLANNER and BEHEERDER users
    io.to('role:PLANNER').to('role:BEHEERDER').emit('notification:new', notification);
    
    // Also send to the specific user if applicable
    if (notification.userId) {
      io.to(`user:${notification.userId}`).emit('notification:new', notification);
    }
    
    // Also broadcast to all clients as a fallback
    io.emit('notification:new', notification);
    
    return true;
  } catch (error) {
    console.error('Error emitting notification:', error);
    return false;
  }
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

module.exports = { 
  initSocketIO, 
  getIO, 
  emitOrderUpdate, 
  emitNotification,
  shutdown
};