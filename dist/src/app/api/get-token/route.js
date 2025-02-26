"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
// src/app/api/get-token/route.ts
const server_1 = require("next/server");
const next_1 = require("next-auth/next");
const auth_1 = require("@/lib/auth");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function GET() {
    try {
        const session = await (0, next_1.getServerSession)(auth_1.authOptions);
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Use type assertion to tell TypeScript this is our custom user type
        const user = session.user;
        // Get JWT secret
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not configured');
            return server_1.NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }
        // Create token with the asserted user properties
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role
        }, jwtSecret, { expiresIn: '1d' });
        return server_1.NextResponse.json({ token });
    }
    catch (error) {
        console.error('Error generating token:', error);
        return server_1.NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
    }
}
