# syntax=docker/dockerfile:1

# Cloudflare Workflows starter: Vite + Workers + Durable Objects.
# GHCR publish expects ./Dockerfile (see .github/workflows/docker-publish.yml).
# Runtime is wrangler/workerd (glibc), so this image uses Debian not Alpine.

FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

COPY --from=build /app /app
RUN chown -R node:node /app

USER node

ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=8787

EXPOSE 8787

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "8787"]
