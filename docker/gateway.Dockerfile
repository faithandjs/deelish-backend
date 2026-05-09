FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY services/gateway ./services/gateway

RUN npm install --ignore-scripts
RUN npm install --workspace=services/gateway
RUN npm run build --workspace=services/gateway

FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY services/gateway/package.json ./services/gateway/package.json

RUN npm install --workspace=services/gateway --omit=dev

COPY --from=builder /app/services/gateway/dist ./services/gateway/dist

WORKDIR /app/services/gateway
EXPOSE 3000
CMD ["node", "dist/index.js"]