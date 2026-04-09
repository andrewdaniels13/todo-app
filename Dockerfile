# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# --- Stage 2: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY *.ts ./
RUN npm run build

# --- Stage 3: Production ---
FROM node:20-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=deps    --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
ENV NODE_ENV=production LOG_LEVEL=info
USER nodejs
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('./dist/index.js')" 2>/dev/null || exit 1
CMD ["node", "dist/index.js"]

# --- Stage 4: Development ---
FROM node:20-alpine AS development
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm install
COPY *.ts ./
ENV NODE_ENV=development LOG_LEVEL=debug
CMD ["npm", "start"]
