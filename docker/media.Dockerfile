FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace config
COPY package.json ./
COPY tsconfig.json ./
COPY packages/shared ./packages/shared
COPY services/media-service ./services/media-service

# Install all deps
RUN npm install --ignore-scripts
RUN npm install --workspace=packages/shared
RUN npm install --workspace=services/media-service

# Build shared then service
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=services/media-service

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install build tools needed for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

COPY package.json ./
COPY tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/media-service/package.json ./services/media-service/package.json

# Install production deps fresh inside Linux — compiles native modules correctly
RUN npm install --workspace=packages/shared --omit=dev
RUN npm install --workspace=services/media-service --omit=dev

# Copy built JS from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/media-service/dist ./services/media-service/dist

WORKDIR /app/services/media-service
EXPOSE 3002
CMD ["node", "dist/index.js"]