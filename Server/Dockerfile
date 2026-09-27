# Stage 1: Build & Compilation
FROM node:20-alpine AS builder

WORKDIR /app

# Install native compilation dependencies for Alpine Linux
RUN apk add --no-cache openssl libc6-compat

# Copy dependency manifests
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and generate type-safe client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code and build NestJS production bundle
COPY . .
RUN npm run build
RUN npx tsc prisma/seed.ts --outDir dist/prisma --skipLibCheck --module commonjs --target es2022 --esModuleInterop

# Stage 2: Lean Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies for Prisma engine on Alpine
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy container entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]
