// server/socketService.js
const { Server } = require('socket.io');

// Global variable to hold the IO instance
let io = null;

function initSocketIO(httpServer) {
  io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_BASE_URL
        : 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

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

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
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

function emitOrderUpdate(orderId, orderData) {
  if (!io) return false;
  console.log('Emitting order update for:', orderId);

  // Broadcast to all clients
  io.emit('order:updated', { orderId, data: orderData });

  // Also send to specific role rooms
  io.to('role:PLANNER').to('role:BEHEERDER').emit('order:updated', { orderId, data: orderData });

  console.log('Active connections:', io.engine.clientsCount);
  return true;
}

function emitNotification(notification) {
  if (!io) return false;
  console.log('Emitting notification:', notification.id || 'unknown');

  // Send to all PLANNER and BEHEERDER users
  io.to('role:PLANNER').to('role:BEHEERDER').emit('notification:new', notification);

  // Also send to the specific user if applicable
  if (notification.userId) {
    io.to(`user:${notification.userId}`).emit('notification:new', notification);
  }

  console.log('Active connections:', io.engine.clientsCount);
  return true;
}

module.exports = {
  initSocketIO,
  getIO,
  emitOrderUpdate,
  emitNotification
};