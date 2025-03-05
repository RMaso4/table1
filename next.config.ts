// next.config.js
/** @type {import('next').NextConfig} */

const nextConfig = {
  env: {
    JWT_SECRET: process.env.JWT_SECRET || '',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || '',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
  },
  reactStrictMode: true,
  // Remove swcMinify as it's unrecognized according to the build log
  // experimental: {
  //   // Empty experimental section
  // },
  output: 'standalone', // This is important for Docker
};

module.exports = nextConfig;