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

# Create .env file for build (AdonisJS requires it)
RUN echo "NODE_ENV=production" > .env && \
    echo "TZ=Europe/Paris" >> .env && \
    echo "PORT=3333" >> .env && \
    echo "HOST=0.0.0.0" >> .env && \
    echo "LOG_LEVEL=info" >> .env && \
    echo "APP_KEY=build-time-dummy-key-32-chars-minimum" >> .env && \
    echo "SESSION_DRIVER=cookie" >> .env && \
    echo "DB_HOST=localhost" >> .env && \
    echo "DB_PORT=5432" >> .env && \
    echo "DB_USER=postgres" >> .env && \
    echo "DB_PASSWORD=dummy" >> .env && \
    echo "DB_DATABASE=dummy" >> .env

# Build AdonisJS
RUN node ace build

# Production image
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 adonisjs

# Copy production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application
COPY --from=builder /app/build ./build

USER adonisjs

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3333/health || exit 1

CMD ["node", "build/bin/server.js"]
