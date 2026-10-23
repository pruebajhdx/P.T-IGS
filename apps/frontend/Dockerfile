# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy root workspace configs
COPY package.json ./
COPY packages/contracts ./packages/contracts
COPY apps/frontend ./apps/frontend

# Install dependencies and build
RUN npm install
RUN npm run build:contracts || true
RUN npm run --workspace=apps/frontend build

# Production stage with Nginx
FROM nginx:alpine

COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
