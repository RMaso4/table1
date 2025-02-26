// next.config.js
/** @type {import('next').NextConfig} */

const nextConfig = {
  env: {
    JWT_SECRET: process.env.JWT_SECRET || '',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || '',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
  },
  
  // Experimental features that work with Next.js 15.1.7
  experimental: {
    // Remove unsupported serverExternalPackages config
    // If you need this, use a newer version of Next.js or find an alternative
  },
};

module.exports = nextConfig;