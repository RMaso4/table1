"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authOptions = void 0;
const credentials_1 = __importDefault(require("next-auth/providers/credentials"));
const prisma_adapter_1 = require("@next-auth/prisma-adapter");
const client_1 = require("@prisma/client");
const extension_accelerate_1 = require("@prisma/extension-accelerate");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Create separate Prisma clients instead of importing from prisma.ts
const prisma = new client_1.PrismaClient().$extends((0, extension_accelerate_1.withAccelerate)());
const authPrisma = new client_1.PrismaClient();
// Debug environment variables
console.log('ENV CHECK - JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('ENV CHECK - NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET);
console.log('ENV CHECK - PULSE_API_KEY exists:', !!process.env.PULSE_API_KEY);
// Ensure we have the required secrets
const jwtSecret = process.env.JWT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (!jwtSecret) {
    console.error('CRITICAL ERROR: JWT_SECRET environment variable is not set');
}
if (!nextAuthSecret) {
    console.error('CRITICAL ERROR: NEXTAUTH_SECRET environment variable is not set');
}
exports.authOptions = {
    adapter: (0, prisma_adapter_1.PrismaAdapter)(authPrisma),
    secret: nextAuthSecret,
    providers: [
        (0, credentials_1.default)({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!(credentials === null || credentials === void 0 ? void 0 : credentials.email) || !(credentials === null || credentials === void 0 ? void 0 : credentials.password)) {
                    return null;
                }
                try {
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email.toLowerCase() }
                    });
                    if (!user) {
                        return null;
                    }
                    const passwordMatch = await bcryptjs_1.default.compare(credentials.password, user.password);
                    if (!passwordMatch) {
                        return null;
                    }
                    // Return user object with required fields
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role
                    };
                }
                catch (error) {
                    console.error("Authentication error:", error);
                    return null;
                }
            }
        })
    ],
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60, // 24 hours
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    debug: true,
};
