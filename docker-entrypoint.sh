#!/bin/sh
set -e

# Ensure uploads and logs directories exist and have correct permissions
# This runs as root to fix permissions, then switches to node user
# Note: These paths match the volume mounts in docker-compose.yml
mkdir -p /var/www/uploads/iuh /var/log/iuh
chmod -R 755 /var/www/uploads/iuh /var/log/iuh
chown -R node:node /var/www/uploads/iuh /var/log/iuh

# Also ensure /app/uploads and /app/logs exist for fallback (if UPLOADS_DIR not set)
mkdir -p /app/uploads /app/logs
chmod -R 755 /app/uploads /app/logs
chown -R node:node /app/uploads /app/logs

# Switch to node user and execute the main command
exec su-exec node "$@"

