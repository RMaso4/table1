// src/app/api/events/route.ts
import { NextRequest } from 'next/server';

// Remove edge runtime directive
export const dynamic = 'force-dynamic';

// Helper to encode SSE data
function encodeSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest) {
  // Set up Server-Sent Events response headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  try {
    // Create a TransformStream for SSEssssssss
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Write initial connection established message
    writer.write(encodeSSE('connected', { 
      message: 'Connection established',
      timestamp: new Date().toISOString()
    }));

    // Set up a dummy event every 5 seconds
    const interval = setInterval(async () => {
      try {
        // Just send a simple heartbeat event with timestamp
        writer.write(encodeSSE('heartbeat', {
          timestamp: new Date().toISOString(),
          message: 'Server is alive'
        }));
      } catch (error) {
        console.error('Error sending heartbeat:', error);
        writer.write(encodeSSE('error', { message: 'Internal server error' }));
      }
    }, 5000);

    // Handle connection close
    request.signal.addEventListener('abort', () => {
      clearInterval(interval);
      writer.close();
    });

    // Return the stream response
    return new Response(stream.readable, { headers });
  } catch (error) {
    console.error('Error setting up SSE:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to set up event stream' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}