FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/payment-adapters/package*.json ./packages/payment-adapters/

RUN npm ci --workspace=apps/backend --workspace=packages/shared --workspace=packages/payment-adapters

# Build packages
COPY packages ./packages
RUN npm run build --workspace=packages/shared && \
    npm run build --workspace=packages/payment-adapters

# Build backend
COPY apps/backend ./apps/backend
RUN npm run build --workspace=apps/backend

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/payment-adapters/package*.json ./packages/payment-adapters/

# Install production dependencies only
RUN npm ci --only=production --workspace=apps/backend --workspace=packages/shared --workspace=packages/payment-adapters

# Copy built files
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/payment-adapters/dist ./packages/payment-adapters/dist
COPY --from=base /app/apps/backend/dist ./apps/backend/dist
COPY --from=base /app/apps/backend/node_modules ./apps/backend/node_modules

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
