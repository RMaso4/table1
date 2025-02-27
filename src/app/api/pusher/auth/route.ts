// src/app/api/pusher/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  try {
    // Get session data for authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const formData = await request.formData();
    const socketId = formData.get('socket_id')?.toString();
    const channel = formData.get('channel_name')?.toString();
    
    if (!socketId || !channel) {
      return NextResponse.json(
        { error: 'Missing socket_id or channel_name' },
        { status: 400 }
      );
    }
    
    // Cast session.user to include our custom properties 
    // TypeScript needs this type assertion to understand our extended Session type
    const user = session.user as {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
    };
    
    // Prepare authentication data including user info
    const userData = {
      user_id: user.id,
      user_info: {
        name: user.name || user.email,
        email: user.email,
        role: user.role
      }
    };
    
    // Generate auth signature with Pusher
    const authResponse = pusherServer.authorizeChannel(socketId, channel, userData);
    
    // Return the auth response with CORS headers
    const response = NextResponse.json(authResponse);
    
    // Add CORS headers to allow the client to make the request
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    
    return response;
  } catch (error) {
    console.error('Error in Pusher auth:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  return response;
}