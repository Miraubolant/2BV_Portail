# ═══════════════════════════════════════════════════════════════════════════════
# DOCKERFILE - Portail Cabinet d'Avocats
# Multi-stage build optimise pour la production avec Coolify
# ═══════════════════════════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────────────────────────
# STAGE 1: Dependencies
# ───────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

# Installer pnpm globalement
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copier uniquement les fichiers de dependances pour optimiser le cache Docker
COPY package.json pnpm-lock.yaml ./

# Installer toutes les dependances (incluant devDependencies pour le build)
RUN pnpm install --frozen-lockfile

# ───────────────────────────────────────────────────────────────────────────────
# STAGE 2: Builder
# ───────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copier node_modules du stage deps
COPY --from=deps /app/node_modules ./node_modules

# Copier le code source
COPY . .

# Variables d'environnement pour le build
ENV NODE_ENV=production

# Build de l'application AdonisJS (compile TypeScript + Vite)
# --ignore-ts-errors car les fichiers de tests sont exclus du contexte Docker
RUN pnpm build --ignore-ts-errors

# ───────────────────────────────────────────────────────────────────────────────
# STAGE 3: Production
# ───────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Metadonnees de l'image
LABEL maintainer="2BV Cabinet"
LABEL description="Portail Cabinet d'Avocats - Production"
LABEL version="1.0.0"

# Installer dumb-init pour une gestion propre des signaux (SIGTERM, SIGINT)
# et wget pour les health checks
RUN apk add --no-cache dumb-init wget

# Creer un utilisateur non-root pour la securite
RUN addgroup -g 1001 -S nodejs && \
    adduser -S adonisjs -u 1001 -G nodejs

WORKDIR /app

# Installer pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copier package.json pour les dependances de production
COPY package.json pnpm-lock.yaml ./

# Installer UNIQUEMENT les dependances de production
RUN pnpm install --frozen-lockfile --prod && \
    pnpm store prune

# Copier le build depuis le stage builder
COPY --from=builder --chown=adonisjs:nodejs /app/build ./

# Copier les scripts de deploiement
COPY --chown=adonisjs:nodejs scripts/ ./scripts/

# Variables d'environnement par defaut
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333
ENV TZ=Europe/Paris
ENV LOG_LEVEL=info

# Exposer le port de l'application
EXPOSE 3333

# Changer vers l'utilisateur non-root
USER adonisjs

# Health check - verifie que l'API repond
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3333/api/health || exit 1

# Point d'entree avec dumb-init pour gestion des signaux
ENTRYPOINT ["dumb-init", "--"]

# Commande de demarrage
CMD ["node", "bin/server.js"]
