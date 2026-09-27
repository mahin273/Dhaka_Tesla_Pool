#!/bin/sh
set -e

echo "Applying Prisma database migrations..."
npx prisma migrate deploy

echo "Seeding database with story cast and zones..."
node dist/prisma/seed.js

echo "Starting Dhaka Tesla Pool API server..."
exec node dist/main.js
