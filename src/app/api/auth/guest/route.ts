// src/app/api/auth/guest/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // Create a response with session data for guest mode
  const response = NextResponse.json({ 
    success: true,
    guestSession: {
      id: 'guest-' + Date.now(), 
      role: 'GUEST'
    }
  });
  
  // Set the cookie with longer path and SameSite=Lax
  response.cookies.set('guest_mode', 'true', {
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  
  return response;
}