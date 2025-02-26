"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
// app/api/auth/logout/route.ts
const server_1 = require("next/server");
async function POST() {
    // Create a new response
    const response = server_1.NextResponse.json({ success: true });
    // Clear the auth cookie
    response.cookies.set('token', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/',
    });
    // Also try to clear the NextAuth.js session cookie
    response.cookies.set('next-auth.session-token', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/',
    });
    // Clear all possible related cookies to ensure complete logout
    response.cookies.set('next-auth.csrf-token', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/',
    });
    response.cookies.set('next-auth.callback-url', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/',
    });
    // Add the logout flow header to help the middleware
    response.headers.set('x-logout-flow', 'true');
    return response;
}
