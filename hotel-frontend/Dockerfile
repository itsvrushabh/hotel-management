FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock tsconfig.json ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application sources and server
COPY index.html server.ts ./
COPY src ./src

# Pre-bundle assets
RUN bun build src/app.tsx --outdir ./dist --target browser

ENV PORT=3001
ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O - http://localhost:3001/health > /dev/null || exit 1

CMD ["bun", "run", "start"]
