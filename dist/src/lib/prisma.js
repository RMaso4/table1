"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
// src/lib/prisma.ts
const client_1 = require("@prisma/client");
const extension_accelerate_1 = require("@prisma/extension-accelerate");
// Configure Prisma client with advanced connection options
const globalForPrisma = global;
exports.prisma = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        log: ['warn', 'error'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    }).$extends((0, extension_accelerate_1.withAccelerate)());
// Prevent multiple Prisma instances in development
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
// Connection management
async function connectDatabase() {
    try {
        await exports.prisma.$connect();
        console.log('✅ Database connection established');
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
}
async function disconnectDatabase() {
    try {
        await exports.prisma.$disconnect();
        console.log('🔌 Database connection closed');
    }
    catch (error) {
        console.error('❌ Error closing database connection:', error);
    }
}
// Note: Event listeners are not supported with Prisma Accelerate
process.on('beforeExit', async () => {
    console.log('Database connection is about to close');
    await disconnectDatabase();
});
process.on('uncaughtException', (error) => {
    console.error('Unhandled error:', error);
});
