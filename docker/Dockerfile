# Multi-stage build — distroless final image (TECH_PRD §15.1)
# Stage 1: deps
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: builder
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client before build.
# pnpm writes the generated client into its virtual store (.pnpm/.../@prisma/client)
# rather than node_modules/.prisma. Find it and copy to the root so the runner-stage
# COPY instruction can reach it at a predictable path.
RUN pnpm db:generate && \
    if [ ! -d "/app/node_modules/.prisma" ]; then \
      PRISMA_DIR=$(find /app/node_modules/.pnpm -name ".prisma" -type d 2>/dev/null | head -1); \
      [ -n "$PRISMA_DIR" ] && cp -rL "$PRISMA_DIR" /app/node_modules/.prisma \
        || (echo "ERROR: .prisma not found in pnpm store after generate" && exit 1); \
    fi
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* vars are inlined at build time — must be passed as build args
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN pnpm build

# Stage 3: runner — minimal image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Prisma client binaries
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
# Prisma CLI (needed for migrate deploy in CMD)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
# Prisma schema for migrate deploy
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run migrations before starting the server so depends_on health checks are respected
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
