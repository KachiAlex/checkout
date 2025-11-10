FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

RUN npm ci --workspace=apps/frontend

# Build frontend
COPY apps/frontend ./apps/frontend
RUN npm run build --workspace=apps/frontend

# Production stage
FROM nginx:alpine AS production

COPY --from=base /app/apps/frontend/dist /usr/share/nginx/html
COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
