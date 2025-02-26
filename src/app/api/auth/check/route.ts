// src/app/api/auth/check/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  try {
    // Get the server-side session from NextAuth
    const session = await getServerSession(authOptions);
    
    // Get cookies to check for custom token
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name) acc[name] = value;
      return acc;
    }, {});
    
    // Check custom token validity
    let customTokenValid = false;
    let customTokenData = null;
    
    if (cookies['token']) {
      try {
        // Verify the token
        const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
        if (jwtSecret) {
          const decoded = jwt.verify(cookies['token'], jwtSecret);
          customTokenValid = true;
          customTokenData = decoded;
        }
      } catch (e) {
        console.error('Error verifying custom token:', e);
      }
    }
    
    // Prepare authentication status response
    const authStatus = {
      nextAuth: {
        authenticated: !!session,
        session
      },
      customToken: {
        present: !!cookies['token'],
        valid: customTokenValid,
        data: customTokenData
      },
      cookies: Object.keys(cookies).filter(name => 
        name.startsWith('next-auth') || 
        name === 'token' || 
        name.startsWith('__Secure')
      ),
      serverTime: new Date().toISOString()
    };
    
    return NextResponse.json(authStatus);
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return NextResponse.json(
      { error: 'Failed to check authentication status' },
      { status: 500 }
    );
  }
}