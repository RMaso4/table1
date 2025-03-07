// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

// Ensure DATABASE_URL is available
const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
}

// Configure Prisma client with connection pooling and retry logic
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Initialize with robust connection handling
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['warn', 'error'],
    datasources: {
      db: {
        url: DATABASE_URL
      }
    }
  }).$extends(withAccelerate());

// Prevent multiple Prisma instances in development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Improved connection management with retry logic
export async function connectDatabase(retries = 3, delay = 1000) {
  let currentTry = 0;

  while (currentTry < retries) {
    try {
      await prisma.$connect();
      console.log('✅ Database connection established successfully');
      return true;
    } catch (error) {
      currentTry++;
      console.error(`❌ Database connection attempt ${currentTry}/${retries} failed:`, error);

      if (currentTry >= retries) {
        console.error('❌ All database connection attempts failed');
        throw error;
      }

      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, currentTry - 1);
      console.log(`Retrying in ${backoffDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }

  return false;
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

// Ensure proper connection handling
async function initializePrisma() {
  try {
    await connectDatabase();
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
  }
}

// Run connection initialization
initializePrisma();

// Handle cleanup on application shutdown
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT - closing database connections');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM - closing database connections');
  await disconnectDatabase();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await disconnectDatabase();
  process.exit(1);
});