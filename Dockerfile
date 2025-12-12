# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init and su-exec for proper signal handling and user switching
RUN apk add --no-cache dumb-init su-exec

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy email templates to production location
# In production, templates are expected at /app/shared/email/templates/
COPY --from=builder /app/src/shared/email/templates ./shared/email/templates

# Create uploads and logs directories with proper permissions
# Create both fallback paths (/app/uploads, /app/logs) and production paths
RUN mkdir -p /app/uploads /app/logs && \
    mkdir -p /var/www/uploads/iuh /var/log/iuh && \
    chmod -R 755 /app/uploads /app/logs && \
    chmod -R 755 /var/www/uploads/iuh /var/log/iuh && \
    chown -R node:node /app && \
    chown -R node:node /var/www/uploads/iuh /var/log/iuh

# Copy entrypoint script (will run as root to fix permissions)
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Keep root user for entrypoint, will switch to node in script
# USER node

# Expose port (internal port, not external mapping)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]

# Start application
CMD ["node", "dist/main.js"]

