# beatforge — Instrucciones para Claude Code

Estudio de producción musical electrónica en el navegador (estilo house/disco),
con backend/frontend propios, dockerizado y desplegado en VPS propio.

## Stack decidido (NO cambiar sin consultar)

- **Monorepo**: pnpm workspaces
- **Frontend**: Next.js 15 (App Router), TypeScript estricto, Tailwind CSS
- **Motor de audio**: Tone.js (Web Audio API) — corre en cliente, NUNCA en backend
- **Estado del proyecto musical**: Zustand
- **Canvas/waveforms**: Konva.js o canvas nativo + WaveSurfer.js para samples
- **Backend**: Node.js + Express + TypeScript
- **BD**: PostgreSQL + Prisma
- **Auth**: JWT access (corto) + refresh token en cookie httpOnly, hash con argon2
- **Logging**: Pino (nunca loggear passwords/tokens/datos personales)
- **Testing**: Vitest (+ supertest en backend, @testing-library/react en frontend)
- **Lint/format**: ESLint + Prettier, Husky + lint-staged + commitlint (conventional commits)
- **Seguridad**: gitleaks en pre-commit y en CI (GitHub Actions), nunca commitear .env

## Arquitectura de comunicación

- Frontend (Next.js) actúa como BFF: usa Route Handlers (`/api/*`) como proxy
  hacia el backend interno. Evita CORS. NO configurar CORS abierto salvo que
  se decida lo contrario explícitamente.
- El backend NO procesa audio. Solo gestiona: usuarios, proyectos, metadatos
  de tracks/patterns, ficheros de samples, sesiones.
- Todas las rutas del backend cuelgan de `/api/*` (convención fijada por el
  healthcheck en `/api/health`). Las rutas nuevas siguen ese mismo prefijo.

## Despliegue (referencia, no tocar hasta que se indique)

- Contenedores: `beatforge-frontend`, `beatforge-backend`, `beatforge-postgres`
- Red interna Docker: solo frontend expuesto a Nginx Proxy Manager (ya existente
  en el VPS). Backend y postgres SIN puertos publicados al host.
- SSL vía Cloudflare Origin Certificate (patrón ya usado en otros proyectos:
  CV Crafter/TalentHub, AgentLogic, CodeAI)
- Subdominio previsto: beatforge.bitxodev.com
- Nunca pedir ni usar acceso SSH directo al VPS (regla global del usuario).

## Forma de trabajo (importante)

- **Una tarea a la vez, sin improvisar.** No adelantar pasos de la arquitectura
  que aún no se han acordado (ej: no tocar auth/Prisma hasta que se indique
  explícitamente en el prompt).
- Explicar siempre las decisiones de arquitectura tomadas, no solo aplicarlas.
- Generar tests con cada cambio funcional relevante.
- Respetar la estructura de carpetas ya creada; no reestructurar sin consultar.
- Nunca añadir dependencias nuevas no acordadas sin mencionarlo explícitamente
  antes de instalarlas.
- El propietario del proyecto (Void) no tiene experiencia en producción musical
  — explicar brevemente el "por qué" cuando se tomen decisiones sobre el motor
  de audio (Tone.js), no solo el "qué".

## Comandos

Usar siempre el nombre de paquete completo con `--filter` (no "backend"/"frontend" a secas):

```bash
pnpm --filter @beatforge/backend <comando>
pnpm --filter @beatforge/frontend <comando>
pnpm --filter @beatforge/shared <comando>

pnpm dev              # frontend + backend en paralelo
pnpm test             # vitest en ambas apps
pnpm test:watch
pnpm lint / lint:fix
pnpm typecheck
pnpm check-env        # valida que .env.example cubre todo lo que el código usa
pnpm build

docker compose -f docker-compose.dev.yml up --build   # entorno dev completo
```

- Node: usar la versión fijada en `.nvmrc` (`nvm use`). pnpm ya viene fijado
  por `packageManager` en el `package.json` raíz.
- El hook `pre-commit` (Husky) ejecuta gitleaks vía Docker — el daemon de
  Docker debe estar corriendo o el commit falla aunque no haya secretos.
- Commits en formato conventional commits (`feat`, `fix`, `chore`, `docs`,
  `refactor`, `test`, `style`, `perf`, `ci`, `revert`); commitlint los valida
  en el hook `commit-msg`.

## Variables de entorno

- Todo lo nuevo que el código lea de `process.env` debe añadirse también a
  `.env.example` (con placeholder, nunca con un valor real) — si no,
  `pnpm check-env` falla.
- `.env` real nunca se commitea (bloqueado por `.gitignore` y por gitleaks).

## Estado actual del proyecto

- [x] Prompt 1: Esqueleto del monorepo
- [x] Prompt 1.5: ESLint + Prettier + Husky + commitlint + CI básico
- [x] Prompt 1.6: gitleaks + protección de secretos
- [x] Prompt 1.7: Testing (Vitest) + Pino + health-check + .vscode + Dependabot
- [x] Prompt 2: Prisma + modelo de datos (User, Project, Track, Pattern, Sample, Session)
- [ ] Pendiente: auth (JWT + refresh + sesiones)
- [ ] Pendiente: integración Tone.js (secuenciador + samples + timeline de arreglo)
- [ ] Pendiente: Docker Compose producción completo

## Prisma (notas específicas tras el Prompt 2)

- **Prisma v7**: generator `prisma-client` (no `prisma-client-js`), cliente
  generado en `apps/backend/src/generated/prisma` (gitignored, se regenera
  con `prisma generate` — ya encadenado en los scripts `dev`/`build`/`test`).
- Requiere **driver adapter** obligatorio: `@prisma/adapter-pg` + `pg`. La URL
  de conexión NO vive en `schema.prisma`, vive en `apps/backend/prisma.config.ts`.
- Postgres de desarrollo remapeado a **puerto 5434** en el host (el 5432 está
  ocupado por otro servicio en esta máquina) — ver `POSTGRES_HOST_PORT` en
  `.env.example`. La red interna de Docker sigue usando el 5432 normal.
- Comandos: `pnpm --filter @beatforge/backend run db:migrate` (dev),
  `db:migrate:deploy` (prod), `db:studio`, `db:generate`.
