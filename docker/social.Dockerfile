FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace config
COPY package.json ./
COPY tsconfig.json ./
COPY packages/shared ./packages/shared
COPY services/social-service ./services/social-service

# Install all deps
RUN npm install --ignore-scripts
RUN npm install --workspace=packages/shared
RUN npm install --workspace=services/social-service

# Build shared then service
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=services/social-service

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install build tools needed for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

COPY package.json ./
COPY tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/social-service/package.json ./services/social-service/package.json

# Install production deps fresh inside Linux — compiles native modules correctly
RUN npm install --workspace=packages/shared --omit=dev
RUN npm install --workspace=services/social-service --omit=dev

# Copy built JS from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/social-service/dist ./services/social-service/dist

WORKDIR /app/services/social-service
EXPOSE 3003
CMD ["node", "dist/index.js"]