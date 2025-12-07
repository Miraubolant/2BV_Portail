#!/bin/sh
# Build script for Docker/Coolify
# Sets dummy environment variables for build time only

export NODE_ENV=production
export TZ=Europe/Paris
export PORT=3333
export HOST=0.0.0.0
export LOG_LEVEL=info
export APP_KEY=build-time-dummy-key-32-chars-min
export SESSION_DRIVER=cookie
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=dummy
export DB_DATABASE=dummy

# Run the actual build
node ace build
