// server.js
require('dotenv').config(); // Add this at the top of the file
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Import the socket service
const socketService = require('./server/socketService');

// Environment and configuration setup
function setupEnvironment() {
  // Check critical environment variables
  const requiredVars = [
    'DATABASE_URL', 
    'NEXTAUTH_SECRET', 
    'JWT_SECRET',
    'NEXT_PUBLIC_BASE_URL'
  ];

  console.log('\n==== SERVER ENVIRONMENT CHECK ====');
  let missingVars = 0;
  requiredVars.forEach(varName => {
    const exists = !!process.env[varName];
    console.log(`${varName}: ${exists ? '✅ FOUND' : '❌ MISSING'}`);
    
    if (!exists) {
      console.error(`\x1b[31mCRITICAL: ${varName} is not set!\x1b[0m`);
      missingVars++;
    }
  });
  
  if (missingVars > 0) {
    console.error(`\x1b[31m${missingVars} required environment variables are missing!\x1b[0m`);
    console.error('The application may not function correctly.');
  } else {
    console.log('\x1b[32mAll required environment variables are set.\x1b[0m');
  }
  
  console.log('=====================================\n');
}

// Initialize database connection
async function initDatabaseConnection() {
  try {
    // Import PrismaClient
    const { connectDatabase } = require('./dist/src/lib/prisma');
    await connectDatabase(5, 2000); // 5 retries with exponential backoff
    return true;
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
    return false;
  }
}

// Initialize real-time updates
async function initRealTimeUpdates() {
  try {
    // Dynamic import of the pulse initialization module
    const pulseInit = require('./dist/src/lib/pulseInit').default;
    await pulseInit();
    console.log('✅ Real-time updates initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing real-time updates:', error);
    console.log('Will continue without real-time database updates');
    return false;
  }
}

// Main server initialization
async function startServer() {
  // Setup environment
  setupEnvironment();

  // Connect to database first
  const dbConnected = await initDatabaseConnection();
  if (!dbConnected) {
    console.warn('WARNING: Server starting with database connection issues');
  }

  // Determine development mode
  const dev = process.env.NODE_ENV !== 'production';
  const hostname = process.env.HOSTNAME || 'localhost';
  const port = parseInt(process.env.PORT || '3000', 10);

  // Initialize Next.js app
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  try {
    // Prepare Next.js app
    await app.prepare();

    // Create HTTP server with improved request handling
    const server = createServer((req, res) => {
      // Add request ID for tracking
      const requestId = Math.random().toString(36).substring(2, 15);
      
      // Set up basic request logging
      const startTime = Date.now();
      const { method, url } = req;
      
      // Add CORS headers for all responses
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
      );

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Log request completion
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`[${requestId}] ${method} ${url} ${res.statusCode} ${duration}ms`);
      });

      // Handle request
      const parsedUrl = parse(req.url || '/', true);
      
      try {
        handle(req, res, parsedUrl);
      } catch (error) {
        console.error(`[${requestId}] Error handling request:`, error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    // Add graceful shutdown logic
    function gracefulShutdown(signal) {
      return async () => {
        console.log(`\n${signal} received, shutting down gracefully...`);
        
        // Attempt to close the HTTP server
        server.close(() => {
          console.log('HTTP server closed');
        });
        
        // Shut down socket.io
        if (socketService && typeof socketService.shutdown === 'function') {
          console.log('Shutting down socket service...');
          socketService.shutdown();
        }
        
        // Disconnect database
        try {
          const { disconnectDatabase } = require('./dist/src/lib/prisma');
          await disconnectDatabase();
        } catch (error) {
          console.error('Error disconnecting from database:', error);
        }
        
        // Exit with success code
        setTimeout(() => {
          console.log('Forcing exit after timeout');
          process.exit(0);
        }, 5000).unref();
      };
    }

    // Set up signal handlers
    process.on('SIGTERM', gracefulShutdown('SIGTERM'));
    process.on('SIGINT', gracefulShutdown('SIGINT'));

    // Import config to determine which real-time service to use
    let realtimeConfig;
    try {
      realtimeConfig = require('./dist/src/lib/socketConfig').REALTIME_CONFIG;
    } catch (error) {
      console.warn('Could not load realtime config, defaulting to Socket.IO only');
      realtimeConfig = { USE_SOCKET_IO: true, USE_PUSHER: false };
    }

    // Initialize Socket.IO only if enabled
    if (realtimeConfig.USE_SOCKET_IO) {
      const io = socketService.initSocketIO(server);
      console.log('🚀 Socket.IO server initialized with engine:', io.engine.opts.path);
    } else {
      console.log('⏭️ Socket.IO initialization skipped (disabled in config)');
    }

    // Initialize real-time updates
    await initRealTimeUpdates();

    // Start server
    server.listen(port, (err) => {
      if (err) throw err;
      console.log(`✅ Server running on http://${hostname}:${port}`);
    });

  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
}

// Run the server
startServer();