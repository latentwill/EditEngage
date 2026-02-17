FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && echo "=== NPM CI SUCCESS ==="

COPY . .

# Debug: show node/npm versions and env
RUN echo "=== NODE $(node -v) NPM $(npm -v) ===" && \
    echo "=== ENV VARS ===" && env | grep -E '^(PUBLIC_|SUPABASE_|NODE_|ORIGIN)' || true && \
    echo "=== STARTING BUILD ===" && \
    npm run build && \
    echo "=== BUILD SUCCESS ==="

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
RUN npm ci --omit=dev

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "build"]
