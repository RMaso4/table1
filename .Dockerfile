FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy prisma schema files first - THIS IS THE KEY FIX
COPY prisma ./prisma/

# Copy package files
COPY package.json package-lock.json* ./

# We need to either:
# Option 1: Skip the postinstall script during docker build
RUN npm ci --ignore-scripts

# And then manually run prisma generate after dependencies are installed
RUN npx prisma generate

# Rest of your Dockerfile remains the same...
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# No need to generate again, we did it in the deps stage
# Just build the application
RUN npm run build

# Production image, copy all files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/server ./server
COPY --from=builder /app/next.config.ts ./

USER nextjs

EXPOSE 3000

ENV PORT=3000

# Start the server
CMD ["node", "server.js"]