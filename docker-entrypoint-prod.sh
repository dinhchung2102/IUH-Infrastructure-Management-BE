#!/bin/sh
set -e

# Get UID and GID from environment or use defaults
CURRENT_UID=${UID:-1000}
CURRENT_GID=${GID:-1000}

echo "Running as UID: $CURRENT_UID, GID: $CURRENT_GID"

# Ensure uploads and logs directories exist with correct permissions
# These paths match the volume mounts in docker-compose.prod.yml
mkdir -p /var/www/uploads/iuh /var/log/iuh

# Set ownership to current user (from host)
chown -R $CURRENT_UID:$CURRENT_GID /var/www/uploads/iuh /var/log/iuh

# Set permissions
chmod -R 755 /var/www/uploads/iuh /var/log/iuh

# Also ensure /app/uploads and /app/logs exist for fallback (if UPLOADS_DIR not set)
mkdir -p /app/uploads /app/logs
chown -R $CURRENT_UID:$CURRENT_GID /app/uploads /app/logs
chmod -R 755 /app/uploads /app/logs

echo "Directories created and permissions set:"
echo "  /var/www/uploads/iuh (UID:$CURRENT_UID, GID:$CURRENT_GID)"
echo "  /var/log/iuh (UID:$CURRENT_UID, GID:$CURRENT_GID)"

# Switch to the specified user and execute the main command
exec su-exec $CURRENT_UID:$CURRENT_GID "$@"

