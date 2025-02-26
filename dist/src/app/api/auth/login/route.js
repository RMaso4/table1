"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
// app/api/auth/login/route.ts
const server_1 = require("next/server");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("@/lib/prisma");
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
async function POST(request) {
    try {
        // Parse request body
        const body = await request.json();
        const { email, password } = body;
        // Basic validation
        if (!email || !password) {
            return server_1.NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }
        if (!isValidEmail(email)) {
            return server_1.NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }
        // Find user
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user) {
            return server_1.NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }
        // Check password
        const passwordMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!passwordMatch) {
            return server_1.NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }
        // Get JWT secret - safely fallback to NEXTAUTH_SECRET if JWT_SECRET isn't set
        const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET and NEXTAUTH_SECRET are not configured');
            return server_1.NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
        }
        // Create token
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role
        }, jwtSecret, { expiresIn: '1d' });
        // Create response
        const response = server_1.NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name
            }
        }, { status: 200 });
        // Set cookie
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 86400, // 24 hours
            path: '/',
        });
        return response;
    }
    catch (error) {
        console.error('Login error:', error);
        return server_1.NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
    }
}
