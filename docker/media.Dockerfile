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

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/services/media-service/dist ./services/media-service/dist
COPY --from=builder /app/services/media-service/package.json ./services/media-service/package.json
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/services/media-service
EXPOSE 3002
CMD ["node", "dist/index.js"]