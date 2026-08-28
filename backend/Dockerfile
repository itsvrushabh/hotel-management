# Multi-stage build for Rust backend
FROM rust:bookworm AS builder
WORKDIR /app

# Copy dependency manifests for layer caching
COPY Cargo.toml Cargo.lock ./

# Pre-fetch and compile dependencies with dummy target
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release && rm -rf src

# Copy real sources and migrations
COPY src ./src
COPY migrations ./migrations

# Rebuild with actual application sources
RUN touch src/main.rs && cargo build --release

# Final runtime image
FROM debian:bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/hotel-backend /app/hotel-backend
COPY --from=builder /app/migrations /app/migrations

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["/app/hotel-backend"]
