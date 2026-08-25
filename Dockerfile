FROM node:20-bookworm-slim AS build
WORKDIR /app

# better-sqlite3 falls back to compiling from source if no prebuilt
# binary matches this platform, so build tools are needed at this stage.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
 && npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

RUN mkdir -p /app/data && chown -R node:node /app
USER node

VOLUME ["/app/data"]
CMD ["node", "dist/index.js"]
