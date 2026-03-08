FROM node:20-alpine AS builder

WORKDIR /app

ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY

# Coolify injects NODE_ENV=production as a build arg which prevents
# devDependencies from being installed. Force development for install.
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN echo "NODE_ENV=$NODE_ENV" && npm ci && echo "Installed $(ls node_modules | wc -l) packages"

COPY . .
RUN npm run build && echo "Build output:" && ls -la build/

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

ENV NODE_ENV=production
RUN npm ci --omit=dev && echo "Production deps: $(ls node_modules | wc -l) packages"

ENV PORT=3000

EXPOSE 3000

HEALTHCHECK NONE
CMD ["sh", "-c", "echo 'CONTAINER STARTING' && ls build/ && echo 'NODE VERSION:' && node --version && echo 'STARTING APP...' && exec node build"]
