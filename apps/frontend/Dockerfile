FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── dev: hot-reload con Next.js ───────────────────────────────────────────────
FROM base AS dev
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/frontend/package.json ./apps/frontend/
RUN pnpm install
COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend
WORKDIR /app/apps/frontend
CMD ["pnpm", "run", "dev"]

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/frontend/package.json ./apps/frontend/
RUN pnpm install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────────────────
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend
COPY package.json pnpm-workspace.yaml ./
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @beatforge/frontend run build

# ── runner: imagen mínima con standalone output ───────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Con output:standalone y outputFileTracingRoot apuntando a la raíz del monorepo,
# el standalone se genera en apps/frontend/.next/standalone/apps/frontend/
COPY --from=build /app/apps/frontend/.next/standalone ./
COPY --from=build /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build /app/apps/frontend/public ./apps/frontend/public
WORKDIR /app/apps/frontend
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
