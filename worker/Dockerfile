# Use Node.js 18 as base image
FROM node:18-slim

# Install Playwright browser dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including Playwright)
RUN npm ci --only=production

# Install Playwright browsers
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create non-root user
RUN useradd -m -u 1000 worker
USER worker

# Expose port (for health checks)
EXPOSE 8080

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the worker
CMD ["node", "worker.js"]
