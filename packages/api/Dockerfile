# --- Build stage ---
FROM node:20-slim AS builder

WORKDIR /app

# Install openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY packages/api/package.json ./packages/api/
COPY packages/api/tsconfig.json ./packages/api/
COPY packages/api/prisma ./packages/api/prisma/

WORKDIR /app/packages/api
RUN npm install

COPY packages/api/src ./src

RUN npx prisma generate
RUN npx tsc

# --- Production stage ---
FROM node:20-slim AS runner

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY --from=builder /app/packages/api/package.json ./
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/prisma ./prisma
COPY --from=builder /app/packages/api/node_modules ./node_modules

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4001/status', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
