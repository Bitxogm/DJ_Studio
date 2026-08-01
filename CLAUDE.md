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
- **Auth**: JWT access + refresh token aleatorio, AMBOS en cookies httpOnly
  (nunca localStorage/JS). Passwords con argon2, refresh token hasheado con
  SHA-256 (ver sección "Convenciones de auth" más abajo)
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
- [x] Prompt 3: Auth completa (register/login/refresh/logout/me) + CRUD de Project protegido
- [x] Prompt 4: CRUD de Track, Pattern y Sample (ownership en cadena, subida de audio)
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

## Convenciones de auth (tras el Prompt 3)

- **Access token**: JWT (`{ sub: userId }`, nada más), cookie httpOnly
  `beatforge_access`, path `/`, expira en `JWT_EXPIRES_IN` (15m).
- **Refresh token**: string aleatorio de 512 bits (`crypto.randomBytes(64)`),
  NUNCA un JWT. En BD solo se guarda su hash SHA-256 (`Session.refreshTokenHash`).
  Cookie httpOnly `beatforge_refresh`, path `/api/auth` (no solo `/api/auth/refresh`:
  `logout` también necesita leerla para saber qué sesión revocar, y el navegador
  no adjunta una cookie fuera de su path). Rotación obligatoria en cada refresh
  (se revoca la sesión vieja y se crea una nueva en la misma transacción).
- **Ninguno de los dos tokens toca JS del navegador**: ambos son cookies httpOnly.
  El frontend (Next.js BFF) solo reenvía cookies vía sus Route Handlers, nunca
  los lee ni los guarda en localStorage/sessionStorage/estado de React.
- **`secure` de las cookies** se deriva de `NODE_ENV` (`config.cookies.secure`),
  nunca es una variable manual — en producción siempre `true`, sin excepción.
- **Pertenencia de recursos**: todo el CRUD de `Project` filtra siempre por
  `req.userId` (viene del JWT verificado por `requireAuth`), NUNCA por un
  `userId` del body/params. Si el recurso no existe o es de otro usuario,
  siempre `404` (nunca `403`, para no filtrar existencia de recursos ajenos).
- Rate limiting estricto (5/15min) solo en `/api/auth/login` y `/api/auth/register`,
  con limiters independientes entre sí (agotar uno no bloquea el otro).

## Ownership en cadena (tras el Prompt 4)

Cada recurso verifica pertenencia subiendo por su cadena de relaciones hasta
`User`, nunca confiando en un `userId` que venga del body/params. Middlewares
en `src/middleware/ownership.middleware.ts`, siempre 404 si no existe o es de
otro usuario (nunca 403):

- **Project → User** (1 salto): `requireProjectOwnership`.
- **Track → Project → User** (2 saltos): `requireTrackInProject` (cuando ya se
  verificó el Project por `:projectId` en la URL) o `requireTrackOwnership`
  (standalone, sin `:projectId` en la URL — usado por las rutas de Pattern).
- **Pattern → Track → Project → User** (3 saltos): `requirePatternInTrack`
  (requiere que antes haya corrido `requireTrackOwnership`).
- **Sample → User** (1 salto, sin cadena: un Sample es directamente del
  usuario, reutilizable entre proyectos): `requireSampleOwnership`.

Cada middleware adjunta el recurso ya cargado a `req.project` / `req.track` /
`req.pattern` / `req.sample` (declaration merging en `src/types/express.d.ts`)
para que el controller no tenga que volver a consultarlo.

**Nesting de URLs** (decisión deliberada, no todo cuelga de `/api/projects`):

- Track: `/api/projects/:projectId/tracks` — el ownership de Project ya se
  verifica en el mount de `app.ts`, antes de entrar a `trackRouter`.
- Pattern: `/api/tracks/:trackId/patterns` (NO
  `/api/projects/:projectId/tracks/:trackId/patterns`) — `trackId` ya es único
  globalmente y anidar un 4º nivel solo alarga la URL sin aportar nada a la
  autorización, que se verifica en servidor igualmente.
- Sample: `/api/samples`, plano, fuera de `/api/projects` por completo.

**Subida de audio** (`/api/samples`, multer + `src/middleware/upload.middleware.ts`):

- Solo `audio/wav`, `audio/mpeg`, `audio/mp3`, `audio/ogg`. El límite de tamaño
  (`MAX_FILE_SIZE_MB`) lo aplica multer mientras recibe el stream, antes de
  terminar de escribir a disco.
- Nombre de fichero siempre generado (`crypto.randomUUID()` + extensión del
  mimetype), nunca el nombre original del usuario — `originalName` se guarda
  aparte solo para mostrarlo en la UI.
- Doble verificación de tipo: mimetype declarado (multer `fileFilter`) +
  primeros bytes del fichero ya escrito (`src/utils/audioFileSignature.ts`,
  comprobación manual de cabecera RIFF/WAVE, ID3/frame-sync MPEG, OggS — sin
  dependencia nueva, evita `file-type` por ser ESM-only y no necesitar los
  demás formatos que detecta).
- Borrar un Sample nunca falla por estar en uso: `Track.sampleId` tiene
  `onDelete: SetNull`, así que un Track que lo usaba simplemente se queda sin
  sample asignado.
- El volumen de `UPLOAD_DIR` está montado en ambos `docker-compose*.yml`
  (`uploads_data_dev` / `uploads_data`) para que persista entre reinicios del
  contenedor backend.
