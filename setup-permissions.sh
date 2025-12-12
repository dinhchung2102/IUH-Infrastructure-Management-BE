#!/bin/bash
# Script để setup permissions cho Docker volumes trên Linux

set -e

# Lấy UID/GID của user hiện tại
CURRENT_UID=$(id -u)
CURRENT_GID=$(id -g)

echo "Setting up permissions for Docker volumes..."
echo "Current user: $USER (UID: $CURRENT_UID, GID: $CURRENT_GID)"

# Tạo thư mục nếu chưa có
mkdir -p uploads logs

# Set ownership
echo "Setting ownership..."
sudo chown -R $CURRENT_UID:$CURRENT_GID uploads logs

# Set permissions
echo "Setting permissions..."
chmod -R 755 uploads logs

echo "✅ Permissions set successfully!"
echo ""
echo "You can now run:"
echo "  export UID=$CURRENT_UID"
echo "  export GID=$CURRENT_GID"
echo "  docker-compose -f docker-compose.prod.yml up -d"

