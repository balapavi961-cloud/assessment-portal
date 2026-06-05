# ─── Stage 1: Builder ────────────────────────────────────────────────────────
# Use Debian Bookworm Slim (~200MB) instead of full Bookworm (~700MB)
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install compilation and execution dependencies:
#   openjdk-17-jdk     — Java compiler + runtime (javac + java)
#   python3            — Python 3 interpreter
#   python-is-python3  — symlinks 'python' -> 'python3'
#   g++ build-essential — C++ compiler
#   ca-certificates    — needed for HTTPS/MongoDB TLS connections
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk \
    python3 \
    python-is-python3 \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ─── Multi-arch JAVA_HOME ─────────────────────────────────────────────────────
# Render/Railway/Koyeb free tier may run on arm64 (Apple Silicon) or amd64.
# The JVM path differs by architecture. We detect it dynamically at build time
# and write it to /etc/environment so it survives into the container runtime.
RUN JAVA_EXEC=$(readlink -f $(which java)) && \
    JAVA_BIN_DIR=$(dirname "$JAVA_EXEC") && \
    JAVA_HOME_DIR=$(dirname "$JAVA_BIN_DIR") && \
    echo "JAVA_HOME=${JAVA_HOME_DIR}" >> /etc/environment && \
    echo "PATH=${JAVA_BIN_DIR}:/usr/bin:/usr/local/bin:${PATH}" >> /etc/environment && \
    echo "Detected JAVA_HOME: ${JAVA_HOME_DIR}"

# Make JAVA_HOME available for subsequent RUN commands AND at container runtime
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$PATH:/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/lib/jvm/java-17-openjdk-arm64/bin

# ─── Verify compilers at build time ──────────────────────────────────────────
# This causes the build to FAIL EARLY if any compiler is missing,
# instead of discovering it at runtime during a live exam.
RUN echo "=== Compiler Verification ===" && \
    java -version && \
    javac -version && \
    python3 --version && \
    g++ --version && \
    echo "=== All compilers OK ==="

# ─── Install Node.js dependencies ────────────────────────────────────────────
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── Copy application source ─────────────────────────────────────────────────
COPY . .

# Remove any local .env that might have leaked into the build context
# (deployment platforms inject env vars directly — we don't want local creds baked in)
RUN rm -f .env

# ─── Runtime image ───────────────────────────────────────────────────────────
FROM node:20-bookworm-slim

WORKDIR /app

# Re-install runtime-only OS packages (no dev headers needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless \
    python3 \
    python-is-python3 \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME for both architectures — the correct one will resolve at runtime
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$PATH:/usr/lib/jvm/java-17-openjdk-amd64/bin:/usr/lib/jvm/java-17-openjdk-arm64/bin

# Copy built app from builder stage
COPY --from=builder /app /app

# Create non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# Expose port (Render/Railway will inject PORT env var at runtime)
EXPOSE 5000

# Docker native health check — also used by docker-compose
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "server.js"]