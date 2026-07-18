# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@9.15.9 --activate
WORKDIR /workspace

FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM dependencies AS build
COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter api exec prisma generate \
    && pnpm --filter api build \
    && pnpm --filter api deploy --prod /opt/api \
    && cp -R apps/api/dist /opt/api/dist \
    && cp -R apps/api/prisma /opt/api/prisma

FROM dependencies AS migration
ENV NODE_ENV=production
COPY apps/api/prisma apps/api/prisma
RUN node apps/api/node_modules/prisma/build/index.js --version
USER node
ENTRYPOINT ["node", "apps/api/node_modules/prisma/build/index.js"]
CMD ["migrate", "deploy", "--schema", "apps/api/prisma/schema.prisma"]

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && chown node:node /app
COPY --from=build --chown=node:node /opt/api/ ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT || 4000}/api/health`).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "dist/src/main.js"]
