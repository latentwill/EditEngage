FROM node:20-alpine

WORKDIR /app

# Copy both worker and agents packages
COPY packages/worker/package.json ./packages/worker/
COPY packages/agents/package.json ./packages/agents/

# Install worker deps
WORKDIR /app/packages/worker
RUN npm install && npm install tsx

# Copy source for both packages
WORKDIR /app
COPY packages/worker/src ./packages/worker/src
COPY packages/worker/tsconfig.json ./packages/worker/
COPY packages/agents/src ./packages/agents/src
COPY packages/agents/tsconfig.json ./packages/agents/ 2>/dev/null || true

# Link agents package so worker can resolve @editengage/agents
RUN cd /app/packages/worker && npm link /app/packages/agents

ENV NODE_ENV=production

WORKDIR /app/packages/worker
CMD ["node", "--import", "tsx", "src/index.ts"]
