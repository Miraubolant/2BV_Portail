# ================================
# 2BV Portail - Production Dockerfile
# AdonisJS 6 + React + Inertia
# ================================

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Install all dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time env vars and build (these are overridden at runtime by Coolify)
ENV NODE_ENV=production \
    TZ=Europe/Paris \
    PORT=3333 \
    HOST=0.0.0.0 \
    LOG_LEVEL=info \
    APP_KEY=build-time-dummy-key-32-chars-minimum \
    SESSION_DRIVER=cookie \
    DB_HOST=localhost \
    DB_PORT=5432 \
    DB_USER=postgres \
    DB_PASSWORD=dummy \
    DB_DATABASE=dummy

RUN node ace build

# Production image
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 adonisjs

# Copy only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application
COPY --from=builder /app/build ./build

USER adonisjs

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3333/health || exit 1

CMD ["node", "build/bin/server.js"]
