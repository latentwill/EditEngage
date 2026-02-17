FROM node:20-alpine

WORKDIR /app

COPY packages/worker/package.json ./
RUN npm install && npm install ts-node typescript

COPY packages/worker/src ./src
COPY packages/worker/tsconfig.json ./

ENV NODE_ENV=production

CMD ["node", "--loader", "ts-node/esm", "src/index.ts"]
