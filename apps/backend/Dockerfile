FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── dev: instala deps y arranca con tsx watch ─────────────────────────────────
FROM base AS dev
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
CMD ["pnpm", "run", "dev"]

# ── deps: instala todas las dependencias (dev incluidas para compilar) ─────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --frozen-lockfile

# ── build: compila TypeScript ─────────────────────────────────────────────────
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
COPY package.json pnpm-workspace.yaml ./
RUN pnpm --filter @beatforge/backend run build

# ── runner: imagen mínima de producción ──────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
# @beatforge/shared es devDependency (solo tipos), no se necesita en runtime
RUN pnpm install --prod --ignore-scripts
EXPOSE 3001
CMD ["node", "dist/index.js"]
