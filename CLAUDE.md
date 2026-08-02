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
- [x] Prompt 5: Frontend de autenticación (login/registro, BFF, shadcn/ui, tests)
- [x] Prompt 6: Seed de desarrollo (2 usuarios demo) + quick login en /login
- [x] Prompt 7: Esqueleto visual de /studio (sidebar, tracks, diálogos, Zustand)
- [x] Prompt 8: Tone.js -- un Track DRUM suena de verdad, sincronizado al grid de 16 steps
- [ ] Pendiente: mezcla de varios tracks sonando a la vez, resto de TrackType
      (SYNTH/SAMPLE/BASS), edición de steps por click, samples reales, timeline
      de arreglo, efectos, exportación de audio
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

## Frontend (tras el Prompt 5)

**Paleta y tipografía** (branding fijado, replicar en el resto de pantallas):

- Tema oscuro por defecto (`className="dark"` en `<html>`, sin toggle de tema
  por ahora). Fondo slate-950, acento cian (`--primary` / `--ring` en HSL
  `188 86% 53%`, ≈ `#22d3ee`). Variables CSS en
  `src/app/globals.css` (`@layer base > :root`), consumidas vía
  `tailwind.config.ts` (`hsl(var(--x))`), patrón shadcn/ui clásico.
- Tipografía: **Inter** para body/UI (`--font-sans`), **Chakra Petch** solo
  para branding/headings (`--font-display`, clase utilitaria `font-display`)
  — se carga con `next/font/google` en `src/app/layout.tsx`. Chakra Petch NO
  se usa en párrafos largos (cansa la lectura a tamaños de body).
- Los tokens de color legacy `forge.*` (definidos en el Prompt 1) se mantienen
  para el homepage placeholder; los componentes nuevos usan los tokens
  semánticos de shadcn (`bg-background`, `text-foreground`, `bg-primary`...).

**shadcn/ui: instalado a mano, NO vía `npx shadcn init`** — la versión actual
del CLI (v4.x) genera CSS para Tailwind v4 (`@import "shadcn/tailwind.css"`,
variables en `oklch`) y este proyecto tiene Tailwind v3.4 fijado en package.json;
mezclar ambos rompe el build (`border-border` no resuelve). Los componentes en
`src/components/ui/` (`button`, `input`, `label`, `card`, `separator`, `sonner`,
`spinner`, `form`) están escritos a mano en el estilo clásico de shadcn
(CVA + Radix primitives + variables HSL), sin el CLI. Si se necesita un
componente nuevo de shadcn, replicar este patrón manual — no correr el CLI de
nuevo sin antes comprobar que ya soporta Tailwind v3, o se repetirá la rotura.

**Arquitectura BFF de auth**:

- `src/app/api/auth/{register,login,refresh,logout,me}/route.ts`: proxy hacia
  el backend. Usan `BACKEND_INTERNAL_URL` (nueva var de entorno, servidor
  únicamente — NUNCA `NEXT_PUBLIC_API_URL`, que es para el navegador y de
  momento no se usa en ningún sitio real). En Docker apunta a
  `http://backend:3001` (nombre de servicio); en dev sobre host,
  `http://localhost:3001`. **Next.js no carga el `.env` raíz del monorepo
  automáticamente para el frontend** (a diferencia del backend, que lo hace
  explícito en `src/config/env.ts` vía `dotenv`) — para `pnpm --filter
@beatforge/frontend dev` fuera de Docker hay que exportar `BACKEND_INTERNAL_URL`
  a mano o crear un `apps/frontend/.env.local` (gitignored) con ese valor.
  Vía `docker-compose*.yml` ya está inyectada como env del contenedor.
- Traducción de errores centralizada en `src/lib/server/authProxy.ts`
  (`translateAuthError`): 409 en registro → email duplicado, 401 en login →
  credenciales incorrectas, 429 → rate limit, 400 → primer mensaje de Zod.
  Las cookies `Set-Cookie` del backend se reenvían con
  `Headers.getSetCookie()` (nunca `.get('set-cookie')`, que las colapsaría en
  un solo string).
- Cliente tipado hacia esos Route Handlers en `src/lib/api/auth.ts`
  (`AuthApiError` con `{ message, code? }` ya traducido — nunca se propaga el
  body crudo del backend al componente).
- Validación de formularios (Zod) en `src/lib/validation/auth.ts`, mismo shape
  que `apps/backend/src/schemas/auth.schema.ts` pero definida por separado en
  frontend (no se movió a `packages/shared` para no tocar el backend fuera de
  alcance de este prompt).
- Estado de sesión: `src/hooks/useAuth.ts` (llama a `/api/auth/me` al montar,
  expone `user` / `isLoading` / `login` / `register` / `logout`).
- Componentes de auth en `src/components/auth/` (`LoginForm`, `RegisterForm`):
  errores de campo SIEMPRE inline (react-hook-form + zodResolver), errores de
  servidor SIEMPRE como toast (`sonner`), nunca al revés.
- `src/app/(auth)/layout.tsx`: fondo/branding compartido de `/login` y
  `/register`, y el único sitio que redirige a `/studio` si ya hay sesión
  activa (comprobado con `useAuth`). `/studio` (`src/app/studio/page.tsx`)
  hace la comprobación inversa (redirige a `/login` si no hay sesión).

## Seed de desarrollo y Quick login (tras el Prompt 6)

**Usuarios demo** (SOLO entorno local — nunca existen ni deben crearse en
producción; no son secretos reales, son credenciales fijas de `.env`-less
código pensadas para un `NODE_ENV=production` que las rechaza explícitamente):

| Usuario  | Email                  | Password    | Contenido                                                                                          |
| -------- | ---------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| Demo Uno | `dev1@beatforge.local` | `Demo1234!` | Project "Mi primera sesión" (124 BPM, Am) con 2 Tracks (Kick/DRUM, Bajo/BASS) y 1 Pattern cada uno |
| Demo Dos | `dev2@beatforge.local` | `Demo1234!` | Sin proyectos (simula un usuario recién registrado)                                                |

- **Seed**: `apps/backend/prisma/seed.ts`. Idempotente por diseño: borra
  (`deleteMany` por email) y recrea solo estos dos usuarios en cada
  ejecución — nunca toca el resto de la BD. Las contraseñas se hashean con
  el mismo `hashPassword` (argon2) que usa `auth.service.ts` en producción,
  nunca un atajo en texto plano. **Se niega a ejecutarse si
  `NODE_ENV=production`** (lanza y sale con código de error).
- Conectado en `prisma.config.ts` (`migrations.seed`, se dispara solo tras
  `prisma migrate dev`) y como script standalone:
  `pnpm --filter @beatforge/backend run db:seed`.
- Si cambias las credenciales, actualiza los TRES sitios a la vez: este
  archivo, `apps/backend/prisma/seed.ts` y
  `apps/frontend/src/lib/dev/demoUsers.ts`.

**Quick login en `/login`** (botones que rellenan y envían el login por ti,
solo en desarrollo):

- Las credenciales viven como constante de código en
  `apps/frontend/src/lib/dev/demoUsers.ts` (`DEV_ONLY_DEMO_USERS`) —
  deliberadamente NO en variables de entorno, para que no exista ni la
  posibilidad de que alguien las configure sin querer en un `.env` de
  producción.
- **Gate en Server Component, no en cliente ni en CSS**:
  `src/components/auth/QuickLoginSection.tsx` (sin `'use client'`) comprueba
  `process.env.NODE_ENV === 'development'` y devuelve `null` si no lo es,
  ANTES de renderizar `src/components/auth/QuickLoginButtons.tsx` (el
  componente cliente con los botones interactivos). Al ser un Server
  Component, ese chequeo corre en el servidor durante el render de cada
  petición: si es falso, el componente cliente nunca entra en el árbol RSC
  de esa petición, así que ni el HTML servido ni el payload React enviado al
  navegador lo referencian. Esto es distinto (y más robusto) que ocultar el
  bloque con CSS (`display: none` sigue mandando el HTML/JS al navegador) o
  con una condición dentro de un componente cliente (el código sigue
  llegando al bundle, solo se decide en el navegador si se pinta).
- Defensa adicional: `QuickLoginButtons.tsx` repite el mismo chequeo al
  principio de su propio cuerpo. Next.js inlinea `process.env.NODE_ENV` en
  el build, así que en un build de producción ese `if` se resuelve en tiempo
  de compilación y el minificador elimina el resto del cuerpo del
  componente (incluidas las credenciales importadas de `demoUsers.ts`) del
  chunk de JS resultante.
- Verificado con `pnpm --filter @beatforge/frontend build` +
  `grep -r "dev1@beatforge.local" .next/`: sin resultados. Si tocas este
  bloque, repite esa comprobación antes de dar el cambio por bueno — es
  fácil reintroducir una fuga condicionando solo en cliente.

## Estudio: layout y datos (tras el Prompt 7)

`/studio` es un Server Component (`src/app/studio/page.tsx`) que carga la
lista inicial de Projects en el servidor (`src/lib/server/projects.ts`,
habla directo con el backend reenviando la cookie de sesión) y se la pasa a
`StudioShell` (cliente), que hace de orquestador: comprueba sesión
(`useAuth`, redirige a `/login` si no hay), hidrata el store al montar, y
dispara la carga de tracks cuando cambia `selectedProjectId`.

- **Estado**: Zustand (`src/store/studio.ts` — `useStudioStore`), no Context
  ni prop-drilling: ya era la decisión de stack para "estado del proyecto
  musical". Guarda `projects`, `selectedProjectId`, `tracks`, `drumPattern`
  (ver sección de Audio) y sus flags de loading. `selectProject()` resetea
  `tracks`/`drumPattern` para no enseñar datos del proyecto anterior mientras
  carga el nuevo.
- **Mutaciones siempre por el BFF**: `src/app/api/projects/**` y
  `src/app/api/tracks/**`, proxy genérico en `src/lib/server/apiProxy.ts`
  (mismo patrón de traducción de errores que `authProxy.ts` — 401/404/400
  traducidos a `{ message, code? }`, nunca se propaga el body crudo del
  backend).
- **Componentes** en `src/components/studio/`: `ProjectSidebar` (lista +
  selección), `ProjectHeader` (nombre/BPM/key/swing editables inline,
  PATCH al guardar), `TrackList`/`TrackRow` (mixer: badge de color por
  `TrackType`, slider de volumen, mute/solo), `NewProjectDialog`/
  `NewTrackDialog` (shadcn Dialog + react-hook-form + zod).
- Toasts: éxito SOLO en creación de proyecto/track; error en cualquier
  mutación fallida (crear, editar inline, mute/solo). Nunca toast de éxito
  en ediciones/toggles — serían demasiado frecuentes/ruidosos.

## Audio: Tone.js y el secuenciador (tras el Prompt 8)

**Alcance deliberadamente acotado**: solo suena el primer Track de tipo
`DRUM` del proyecto seleccionado, con un único sonido (`Tone.MembraneSynth`,
el sintetizador estándar para kicks — no hace falta un sample todavía).
Nada de mezcla de varios tracks, otros `TrackType`, edición de steps por
click, efectos ni exportación: eso son prompts futuros (ver checklist).

**Por qué Tone.Sequence y no Tone.Loop**: `Pattern.steps` ya es un array fijo
de 16 elementos guardado en la BD. `Tone.Sequence(callback, events,
subdivision)` toma ese array directamente y llama al callback una vez por
elemento a la subdivisión dada (`'16n'`), pasando el propio valor — encaja
exactamente con la forma de los datos. `Tone.Loop` solo dispara un callback
periódico sin noción de "qué array recorre"; habría que llevar un contador
de step a mano para conseguir lo mismo que `Sequence` ya hace.

**Dónde vive la lógica**:

- `src/hooks/useSequencer.ts`: TODA la orquestación de Tone.js (Transport,
  MembraneSynth, Sequence). Los componentes visuales (`SequencerPanel`)
  nunca importan `tone` ni tocan el Transport directamente — solo leen
  `isPlaying`/`currentStep`/`canPlay` y llaman a `play()`/`stop()`.
- `src/lib/sequencer/logic.ts`: lógica PURA sin `tone` ni React
  (`resolveStepTrigger`, `findDrumTrack`, `getPlayDisabledReason`), extraída
  a propósito para poder testearla sin depender de la Web Audio API (que no
  existe en jsdom). `useSequencer` la usa dentro del callback de la
  `Sequence`; `SequencerPanel` la usa para decidir el estado del botón Play.
  El propio hook `useSequencer` NO tiene test directo (no hay forma
  significativa de testear Tone.js real sin Web Audio, y mockearlo entero
  habría sido un test frágil que no prueba nada real) — la cobertura está en
  `logic.test.ts` (la lógica que sí importa) y en `SequencerPanel.test.tsx`
  (mockeando `useSequencer`, comprobando que el botón se deshabilita bien).

**Reglas de Tone.js que hay que respetar si se toca este código**:

- `Tone.start()` SIEMPRE antes de tocar cualquier otra cosa de audio, y solo
  dentro de un handler de click (política de autoplay del navegador). Es
  seguro llamarlo en cada `play()`, no solo la primera vez — es un no-op si
  el contexto ya está arrancado.
- `Tone.Transport.bpm.value = project.bpm`, sincronizado en un efecto propio
  que reacciona a cambios de `bpm` — funciona igual esté sonando o parado.
- Una `Sequence`/`Part` ya iniciada con `.start()` no se puede volver a
  arrancar sin cancelarla antes (Tone.js lanza si el nuevo `time` no es
  estrictamente mayor que el anterior). `stop()` por eso hace
  `dispose()` + `sequenceRef.current = null` siempre, y `play()` reconstruye
  la Sequence si no existe — así nunca hay conflicto de tiempos entre
  play/stop repetidos.
- `Tone.Draw.schedule(callback, time)` para todo lo visual (mover el
  playhead): los callbacks de `Transport`/`Sequence` se disparan _antes_ del
  instante de audio real (look-ahead del scheduler), así que actualizar
  React directamente ahí desincroniza el playhead del sonido. `Draw`
  reprograma el callback contra el instante de audio correcto usando
  `requestAnimationFrame`.
- **Limpieza obligatoria**: un efecto con cleanup dispone el `MembraneSynth`
  al desmontar; otro efecto (con `pattern` en las deps) para el Transport y
  dispone la `Sequence` tanto al desmontar como cada vez que cambia el
  pattern (cambio de proyecto/track) — Tone.js no libera nada de esto solo,
  dejarlo vivo son nodos de audio reales colgados.

**Cómo se verificó** (sin altavoces/oídos propios — honesto sobre el
límite): build + typecheck limpios, `logic.test.ts` cubre la lógica de
disparo/veto de steps, `SequencerPanel.test.tsx` cubre que el botón Play se
deshabilita sin Track DRUM o sin Pattern, y se comprobó por curl que
`GET /api/tracks/:trackId/patterns` devuelve los steps reales sembrados para
el Kick de `dev1@beatforge.local`. Que el kick realmente suene (y no solo
que el código esté bien cableado) solo se puede confirmar en un navegador
real con audio activado — ver el README/instrucciones de prueba manual.
