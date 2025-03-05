// src/app/api/auth/guest/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Create a response with the guest mode cookie
    const response = NextResponse.json({ success: true });
    
    // Set the guest_mode cookie
    response.cookies.set('guest_mode', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    return response;
  } catch (error) {
    console.error('Error enabling guest mode:', error);
    return NextResponse.json(
      { error: 'Failed to enable guest mode' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Create a response that clears the guest mode cookie
    const response = NextResponse.json({ success: true });
    
    // Clear the guest_mode cookie
    response.cookies.set('guest_mode', '', {
      path: '/',
      maxAge: 0,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    return response;
  } catch (error) {
    console.error('Error disabling guest mode:', error);
    return NextResponse.json(
      { error: 'Failed to disable guest mode' },
      { status: 500 }
    );
  }
}