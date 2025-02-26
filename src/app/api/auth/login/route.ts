// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// Use a dedicated Prisma client for authentication
const authPrisma = new PrismaClient({
  log: ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

interface LoginRequest {
  email: string;
  password: string;
}

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export async function POST(request: Request) {
  try {
    console.log('API login attempt received');
    
    // Parse request body
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Basic validation
    if (!email || !password) {
      console.warn('API login missing required fields');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      console.warn('API login invalid email format');
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log(`API login attempt for: ${email}`);

    // Find user
    let user;
    try {
      user = await authPrisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (dbError) {
      console.error('Database error during login:', dbError);
      return NextResponse.json(
        { error: 'Authentication service temporarily unavailable' },
        { status: 503 }
      );
    }

    if (!user) {
      console.warn(`API login user not found: ${email}`);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.warn(`API login password mismatch for: ${email}`);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get JWT secret - safely fallback to NEXTAUTH_SECRET if JWT_SECRET isn't set
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET and NEXTAUTH_SECRET are not configured');
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 }
      );
    }

    // Create token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role
      },
      jwtSecret,
      { expiresIn: '1d' }
    );

    // Create response
    const response = NextResponse.json(
      { 
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name
        }
      },
      { status: 200 }
    );

    // Set cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/',
    });

    console.log(`API login successful for: ${email}`);
    return response;

  } catch (error) {
    console.error('API login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  } finally {
    // No need to disconnect no here since Prisma will handle it,
    // but we could add a manual disconnect if we wanted extra safety
  }
}