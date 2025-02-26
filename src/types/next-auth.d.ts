// src/types/next-auth.d.ts
import { Role } from '@prisma/client';
import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } & DefaultSession['user']
  }

  // Extend the built-in user types
  interface User extends DefaultUser {
    id: string;
    role: Role;
  }
}

// Extend JWT to include custom properties
declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
  }
}