FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY packages/shared ./packages/shared
COPY services/auth-service ./services/auth-service

RUN npm install --ignore-scripts
RUN npm install --workspace=packages/shared
RUN npm install --workspace=services/auth-service
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=services/auth-service

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install build tools needed for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

COPY package.json ./
COPY tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/auth-service/package.json ./services/auth-service/package.json

# Install production deps fresh inside Linux — compiles native modules correctly
RUN npm install --workspace=packages/shared --omit=dev
RUN npm install --workspace=services/auth-service --omit=dev

# Copy built JS from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/auth-service/dist ./services/auth-service/dist

WORKDIR /app/services/auth-service
EXPOSE 3001
CMD ["node", "dist/index.js"]