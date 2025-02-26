// src/lib/pulseService.ts
import { prisma } from './prisma';
import { emitOrderUpdate, emitNotification } from './socketBridge';
import { REALTIME_CONFIG } from './socketConfig';

// TypeScript interface for a Prisma client with stream method
interface PrismaClientWithStream {
  order?: {
    stream: () => unknown;
  };
}

// Check if Pulse is available
const isPulseAvailable = () => {
  try {
    // Check if stream method exists using type assertion
    return typeof (prisma as unknown as PrismaClientWithStream).order?.stream === 'function';
  } catch {
    return false;
  }
};

// Polling implementation for real-time updates
let pollingInterval: NodeJS.Timeout | null = null;
let isPolling = false;

// Fallback to polling if Pulse is not available
async function pollForOrderChanges() {
  // Skip if Socket.IO is disabled
  if (!REALTIME_CONFIG.USE_SOCKET_IO) {
    console.log('Socket.IO disabled in config. Skipping polling.');
    return;
  }

  console.log('Starting polling for database changes...');
  
  if (isPolling) {
    console.log('Polling already active, skipping initialization');
    return;
  }
  
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  let lastChecked = new Date();
  isPolling = true;
  
  pollingInterval = setInterval(async () => {
    try {
      // Find orders updated since last check
      const updatedOrders = await prisma.order.findMany({
        where: {
          updatedAt: { gt: lastChecked }
        }
      });
      
      if (updatedOrders.length > 0) {
        console.log(`Found ${updatedOrders.length} updated orders`);
        
        for (const order of updatedOrders) {
          console.log(`Order update detected by polling: ${order.id} (${order.verkoop_order})`);
          await emitOrderUpdate(order.id, order);
        }
      }
      
      // Find notifications created since last check
      const newNotifications = await prisma.notification.findMany({
        where: {
          createdAt: { gt: lastChecked }
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            }
          },
          order: {
            select: {
              verkoop_order: true,
            }
          }
        }
      });
      
      if (newNotifications.length > 0) {
        console.log(`Found ${newNotifications.length} new notifications`);
        
        for (const notification of newNotifications) {
          console.log('New notification detected by polling:', notification.id);
          await emitNotification(notification);
        }
      }
      
      // Update last checked timestamp
      lastChecked = new Date();
    } catch (error) {
      console.error('Error in polling for changes:', error);
    }
  }, 3000);  // Poll every 3 seconds
}

// Initialize all streams or fallback to polling
export async function initPulseStreams() {
  // Skip everything if both real-time services are disabled
  if (!REALTIME_CONFIG.USE_SOCKET_IO && !REALTIME_CONFIG.USE_PUSHER) {
    console.log('All real-time updates are disabled in config. Skipping initialization.');
    return;
  }
  
  // Skip Socket.IO based polling if it's disabled
  if (!REALTIME_CONFIG.USE_SOCKET_IO) {
    console.log('Socket.IO is disabled in config. Skipping Socket.IO polling.');
    return;
  }
  
  console.log('Checking if Pulse is available...');
  
  if (isPulseAvailable()) {
    console.log('Pulse is available, but not fully implemented in this version');
    console.log('Falling back to polling mechanism');
    await pollForOrderChanges();
  } else {
    console.log('Pulse not available, using polling mechanism');
    await pollForOrderChanges();
  }
}

// Clean up resources
export function cleanup() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    isPolling = false;
  }
}