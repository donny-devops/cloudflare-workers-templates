FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

RUN groupadd --system --gid 1001 app \
	&& useradd --system --uid 1001 --gid app --home-dir /app --shell /usr/sbin/nologin app

COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
RUN chown -R app:app /app

USER app

ENV NODE_ENV=production \
	HOME=/tmp

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD ["node", "-e", "fetch('http://127.0.0.1:8787/').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["./node_modules/.bin/wrangler", "dev", "--config", "dist/cloudflare_workers_templates/wrangler.json", "--ip", "0.0.0.0", "--port", "8787", "--local", "--show-interactive-dev-session", "false", "--persist-to", "/tmp/wrangler-state"]
