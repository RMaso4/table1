// next.config.js
/** @type {import('next').NextConfig} */

const nextConfig = {
  env: {
    JWT_SECRET: process.env.JWT_SECRET || '',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || '',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
  },
  
  // Fixed experimental config
  experimental: {
    serverExternalPackages: ['@prisma/client', 'bcrypt'],
  },
};

module.exports = nextConfig;