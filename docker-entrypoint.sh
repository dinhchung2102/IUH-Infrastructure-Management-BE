#!/bin/sh
set -e

# Ensure uploads and logs directories exist and have correct permissions
# This runs as root to fix permissions, then switches to node user
mkdir -p /app/uploads /app/logs
chmod -R 755 /app/uploads /app/logs
chown -R node:node /app/uploads /app/logs

# Switch to node user and execute the main command
exec su-exec node "$@"

