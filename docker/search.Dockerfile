FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace config
COPY package.json ./
COPY tsconfig.json ./
COPY packages/shared ./packages/shared
COPY services/search-service ./services/search-service

# Install all deps
RUN npm install --ignore-scripts
RUN npm install --workspace=packages/shared
RUN npm install --workspace=services/search-service

# Build shared then service
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=services/search-service

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install build tools needed for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

COPY package.json ./
COPY tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/search-service/package.json ./services/search-service/package.json

# Install production deps fresh inside Linux — compiles native modules correctly
RUN npm install --workspace=packages/shared --omit=dev
RUN npm install --workspace=services/search-service --omit=dev

# Copy built JS from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/search-service/dist ./services/search-service/dist

WORKDIR /app/services/search-service
EXPOSE 3005
CMD ["node", "dist/index.js"]