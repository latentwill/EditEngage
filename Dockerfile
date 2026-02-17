FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY

RUN npm run build > /tmp/build-output.txt 2>&1; \
    echo "EXIT_CODE=$?" >> /tmp/build-output.txt; \
    cp /tmp/build-output.txt /app/build-output.txt

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Serve the build log so we can read it
CMD if [ -d "build" ]; then node build; else echo "Build failed. Log:"; cat /app/build-output.txt; echo "---"; echo "Sleeping to keep container alive..."; sleep 3600; fi
