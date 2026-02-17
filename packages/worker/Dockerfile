FROM node:20-alpine

WORKDIR /app

# Copy both packages
COPY packages/worker ./packages/worker
COPY packages/agents ./packages/agents

# Install worker deps + tsx
WORKDIR /app/packages/worker
RUN npm install && npm install tsx

# Link agents package
RUN npm link /app/packages/agents

ENV NODE_ENV=production

CMD ["node", "--import", "tsx", "src/index.ts"]
