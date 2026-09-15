# ---- Build stage ----
FROM node:20-slim AS build
WORKDIR /app

# Install build dependencies needed by native modules (sharp, workerd)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:20-slim AS production
WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/worker ./worker
COPY --from=build /app/wrangler.jsonc ./

USER appuser

EXPOSE 8787

CMD ["npx", "wrangler", "dev", "--port", "8787"]
