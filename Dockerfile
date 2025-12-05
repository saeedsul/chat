# Build stage
FROM node:18.20.5-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install to ensure optional dependencies are installed
RUN rm -rf node_modules package-lock.json
RUN npm install
RUN npm install @rollup/rollup-linux-x64-musl --save-optional

# Copy source code
COPY . .

# Build the application
ARG API_TARGET=http://host.docker.internal:12434
RUN npm run build

# Production stage
FROM nginx:1.27.3-alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration (optional)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]