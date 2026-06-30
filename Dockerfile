# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && cp -r node_modules /tmp/prod_node_modules
RUN npm ci

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Build
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Production image
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Non-root user for security
RUN addgroup --system --gid 1001 nestjs && \
    adduser --system --uid 1001 --ingroup nestjs nestjs

# Only production node_modules
COPY --from=deps /tmp/prod_node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Ownership
RUN chown -R nestjs:nestjs /app
USER nestjs

EXPOSE 3000

# dumb-init handles PID 1 and forwards signals correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1
