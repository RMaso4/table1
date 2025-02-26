// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Ensure DATABASE_URL is available and provide fallback for easy debugging
const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
}

// Create a dedicated Prisma client for authentication to avoid conflicts
const authPrisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

// Check for required environment variables
const requiredEnvVars = ['NEXTAUTH_SECRET', 'JWT_SECRET', 'DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
}

// Configure NextAuth options
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(authPrisma),
  
  // Use the NEXTAUTH_SECRET environment variable
  secret: process.env.NEXTAUTH_SECRET,
  
  // Configure session strategy
  session: {
    strategy: 'jwt',
    // 24 hours
    maxAge: 24 * 60 * 60,
    // Update session whenever token is accessed
    updateAge: 60 * 60, // 1 hour
  },
  
  // Configure authentication providers
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Find the user in the database
          const user = await authPrisma.user.findUnique({
            where: { 
              email: credentials.email.toLowerCase() 
            }
          });

          // If user doesn't exist, return null (authentication failed)
          if (!user) {
            console.log(`Auth failed: User not found - ${credentials.email}`);
            return null;
          }

          // Verify the password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          // If password is invalid, return null (authentication failed)
          if (!isPasswordValid) {
            console.log(`Auth failed: Invalid password - ${credentials.email}`);
            return null;
          }

          // Authentication succeeded, return the user
          console.log(`Auth successful: ${credentials.email} (${user.role})`);
          
          return {
            id: user.id,
            email: user.email,
            name: user.name || null,
            role: user.role
          };
        } catch (error) {
          console.error("Database error during authentication:", error);
          return null;
        }
      }
    })
  ],
  
  // Configure callbacks
  callbacks: {
    // This callback is called whenever a JWT is created or updated
    async jwt({ token, user }) {
      // Include the user ID and role in the JWT
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    
    // This callback is called whenever a session is checked
    async session({ session, token }) {
      // Make user data available in the session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  
  // Configure custom pages
  pages: {
    signIn: '/login',
    error: '/login',
    signOut: '/login?logout=true',
  },
  
  // Enable debugging in development mode
  debug: process.env.NODE_ENV === 'development',
  
  // Additional options
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60, // 24 hours
      }
    }
  },
};

// Handle cleanup on application shutdown
process.on('SIGTERM', async () => {
  await authPrisma.$disconnect();
});

process.on('SIGINT', async () => {
  await authPrisma.$disconnect();
});