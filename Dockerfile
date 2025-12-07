# ================================
# 2BV Portail - Production Dockerfile
# AdonisJS 6 + React + Inertia
# ================================

# Stage 1: Base image with Node.js
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

# Stage 3: Build the application
FROM base AS builder

# Build-time environment variables (required for AdonisJS build)
ENV NODE_ENV=production
ENV TZ=Europe/Paris
# Dummy APP_KEY for build (real one provided at runtime)
ENV APP_KEY=build-time-key-will-be-replaced-at-runtime

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build AdonisJS (compiles TypeScript + Vite assets)
RUN node ace build

# Stage 4: Production dependencies only
FROM base AS prod-deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Stage 5: Production runtime
FROM base AS runner
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333
ENV TZ=Europe/Paris

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 adonisjs
USER adonisjs

# Copy production dependencies
COPY --from=prod-deps --chown=adonisjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=adonisjs:nodejs /app/build ./build

# Expose port
EXPOSE 3333

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3333/health || exit 1

# Start command
CMD ["node", "./build/bin/server.js"]
