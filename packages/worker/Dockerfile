FROM node:20-alpine

WORKDIR /app

# Copy both packages
COPY packages/worker ./packages/worker
COPY packages/agents ./packages/agents

# Install agents deps first (logfire-node + OTEL peer deps)
WORKDIR /app/packages/agents
RUN npm install

# Install worker deps + tsx
WORKDIR /app/packages/worker
RUN npm install && npm install tsx

# Link agents package (deps already installed above)
RUN npm link /app/packages/agents

ENV NODE_ENV=production

CMD ["node", "--import", "tsx", "src/main.ts"]
