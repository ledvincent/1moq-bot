# The one production image: web server, job worker and migrations in one Node process.
# Build from the repository root: docker build -f deploy/Dockerfile -t 1moq-bot:sha-<commit> .
# No secret goes in here: settings come from the environment at run time (deploy/compose.yml).

FROM node:24.21-bookworm-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Build stage: all dependencies, then the UI bundle into dist/web.
FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Production dependencies only.
FROM base AS prod-deps
RUN pnpm install --prod --frozen-lockfile

# Runtime: Node strips the TypeScript types at start, as in local runs.
FROM node:24.21-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    WEB_DIR=dist/web
WORKDIR /app
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY src ./src
COPY drizzle ./drizzle
COPY --from=build /app/dist/web ./dist/web
USER node
EXPOSE 3000
CMD ["node", "src/main.ts"]
