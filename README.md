# BeatForge

Electronic music production studio in the browser.

## Qué es BeatForge

BeatForge es un estudio de producción musical electrónica (estilo house/disco)
que corre entero en el navegador, pensado para gente sin conocimientos previos
de producción musical: no hace falta saber teoría musical ni haber usado un
DAW antes para construir un patrón rítmico.

La unidad básica es el patrón de 16 steps por Track: haces click en las
casillas que quieres que suenen y el motor de audio (Tone.js) sintetiza el
sonido en tiempo real — los instrumentos base no usan samples de audio
pregrabados, son sintetizadores generados por código que reaccionan al
instante a cada cambio. Los instrumentos disponibles hoy son Kick (batería),
Bajo, Hi-hat y Snare, cada uno con su propio synth y su propio patrón, y todos
sonando a la vez con el mismo Transport.

Cualquier step se puede editar en tiempo real, incluso con el secuenciador
sonando — el cambio se aplica al instante en el audio y se guarda en base de
datos (PostgreSQL), así que un patrón se conserva entre sesiones y no depende
de mantener la pestaña abierta.

## Stack

| Layer           | Tech                                                |
| --------------- | --------------------------------------------------- |
| Frontend        | Next.js 15 (App Router) + TypeScript + Tailwind CSS |
| Backend         | Node.js + Express + TypeScript                      |
| Database        | PostgreSQL 16                                       |
| Package manager | pnpm 9 (workspaces monorepo)                        |

## Prerequisites

- Node.js 22+
- pnpm 9+ (`npm install -g pnpm`)
- Docker & Docker Compose (for DB or full-stack dev)

---

## Development

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores
```

### 3a. Dev local sin Docker (requiere PostgreSQL externo)

```bash
# Terminal 1
pnpm --filter @beatforge/backend run dev

# Terminal 2
pnpm --filter @beatforge/frontend run dev
```

> **Nota:** el backend carga el `.env` raíz del monorepo automáticamente (vía
> `dotenv` en `src/config/env.ts`), pero Next.js no lo hace por el frontend —
> solo lee `.env*` dentro de `apps/frontend/`. Por eso este modo necesita
> `apps/frontend/.env.local` (gitignored, no se commitea) con al menos:
>
> ```bash
> BACKEND_INTERNAL_URL=http://localhost:3001
> ```
>
> Es la URL que usan los Route Handlers de `/api/auth/*` (BFF) para hablar con
> el backend desde el servidor de Next.js. Si falta, esas rutas fallan con un
> error 500 al arrancar la petición.
>
> Esto **no hace falta en el modo 3b**: `docker-compose.dev.yml` ya inyecta
> `BACKEND_INTERNAL_URL=http://backend:3001` como variable de entorno del
> contenedor del frontend (resuelve `backend` por nombre de servicio en la red
> interna de Docker), así que ese fichero se ignora por completo ahí.

### 3b. Dev con Docker (todo incluido)

```bash
docker compose -f docker-compose.dev.yml up --build
```

| Servicio | URL                          |
| -------- | ---------------------------- |
| Frontend | http://localhost:3000        |
| Backend  | http://localhost:3001        |
| Health   | http://localhost:3001/health |

---

## Producción

```bash
docker compose up --build -d
```

---

## Estructura

```
beatforge/
├── apps/
│   ├── frontend/          Next.js 15 + Tailwind CSS
│   │   └── src/
│   │       ├── app/       App Router (layouts, pages)
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── lib/
│   │       └── stores/
│   └── backend/           Express + TypeScript
│       └── src/
│           ├── config/
│           ├── controllers/
│           ├── db/
│           ├── middleware/
│           ├── routes/
│           └── services/
├── packages/
│   └── shared/            Tipos TypeScript compartidos
├── docker-compose.yml     Producción
└── docker-compose.dev.yml Desarrollo con hot-reload
```

## Arquitectura

```
Navegador (Tone.js -- motor de audio, corre solo en cliente)
        │
        ▼
Next.js Route Handlers (/api/*)   ← BFF, el cliente nunca llama al backend directo
        │
        ▼
Express backend (/api/*)          ← JWT access + refresh token rotation, cookies httpOnly
        │
        ▼
PostgreSQL (vía Prisma + @prisma/adapter-pg)
```

- **Frontend como BFF**: el navegador solo habla con los Route Handlers de
  Next.js (`apps/frontend/src/app/api/**`), que hacen de proxy hacia el
  backend interno (`BACKEND_INTERNAL_URL`, variable solo de servidor). Esto
  evita CORS por completo -- el cliente nunca hace fetch directo al backend.
- **Backend**: Express + TypeScript, Prisma como ORM (driver adapter
  `@prisma/adapter-pg`) sobre PostgreSQL. Autenticación con JWT de acceso de
  vida corta + refresh token aleatorio con rotación en cada uso, ambos en
  cookies httpOnly (nunca localStorage/JS del navegador).
- **Motor de audio multi-voz**: un único hook (`useSequencer`) orquesta todos
  los Tracks reproducibles a la vez con un registro imperativo
  (`Map<trackId, {synth, sequence}>`) que se construye y destruye dinámicamente
  según qué Tracks tengan Pattern -- no hay un hook por Track (React no
  permite invocar hooks condicionalmente ni en bucles). Qué clase de
  sintetizador de Tone.js le corresponde a cada `TrackType` es una tabla pura
  (`synthKindForTrackType`): `DRUM`→`MembraneSynth`, `BASS`→`MonoSynth`,
  `HIHAT`/`SNARE`→`NoiseSynth` (con distinta configuración de ruido/envelope
  cada uno para diferenciar su timbre).
- **Lógica de audio separada de Tone.js**: las decisiones de qué debe sonar y
  con qué volumen (qué step dispara, si un Track está audible según su
  mute/solo y el solo de los demás, la conversión de volumen lineal a
  decibelios) viven en funciones puras (`src/lib/sequencer/logic.ts`) sin
  importar `tone` ni depender de la Web Audio API -- así se pueden testear
  sin necesitar un navegador real (jsdom no implementa Web Audio).
- **Actualización optimista**: las ediciones de step del secuenciador usan
  `runOptimisticUpdate` (`src/lib/optimisticUpdate.ts`): aplica el cambio de
  inmediato en la UI, lanza la petición al backend, y si falla revierte el
  cambio y muestra un toast de error -- así la edición se siente instantánea
  sin esperar a la respuesta del servidor.

## Cómo trabajamos en este proyecto

Las decisiones de arquitectura y producto se toman fuera del editor, en
conversación (con Claude, vía chat) antes de escribir una sola línea. La
implementación real la hace Claude Code dentro de VS Code, siguiendo prompts
precisos y secuenciales: una tarea a la vez, sin improvisar ni adelantar
decisiones de arquitectura a mitad de una implementación que no se han
acordado explícitamente todavía.

Este README y `CLAUDE.md` documentan las convenciones ya fijadas (stack,
patrones de auth, estructura de carpetas, reglas de Prisma/Tone.js...)
precisamente para no tener que repetir ese contexto en cada sesión nueva.

Cada feature de audio nueva sigue el mismo patrón: primero la lógica pura y
sus tests (sin Tone.js ni Web Audio de por medio), después la integración
real contra el motor de audio, y por último una verificación explícita
(tests + build, y cuando aplica, comprobación manual) antes de dar el cambio
por terminado -- nunca se asume que algo funciona solo porque compila.

## Seguridad

### Reglas básicas

- **Nunca commitear `.env`, `.env.local` ni ninguna variante real.** Solo `.env.example` (con placeholders, sin valores reales) debe subirse al repo. El `.gitignore` bloquea `.env.*` salvo esa excepción.
- Cada commit pasa por **gitleaks** (hook `pre-commit` vía Husky) que escanea el diff staged en busca de API keys, tokens, credenciales de DB y JWT secrets. Si detecta algo, el commit se bloquea. Además, **GitHub Actions** (`secret-scan.yml`) repite el escaneo en cada push/PR como segunda capa, por si alguien salta el hook local con `--no-verify`.
- Antes de desplegar, ejecuta `pnpm check-env` para verificar que todas las variables que el código espera están declaradas en `.env.example` (sin exponer valores).
- No subas certificados (`*.pem`, `*.key`, `*.crt`), carpetas `.aws/` o `.ssh/`, ni ficheros `secrets.json` / `credentials.json`. Todos están cubiertos por `.gitignore`, pero revísalo si añades un tipo de fichero nuevo.

### Si un secreto se filtra por error

1. **Rota el secreto inmediatamente** en el proveedor correspondiente (nueva API key, nuevo `JWT_SECRET`, nueva contraseña de DB) — el secreto expuesto se considera comprometido para siempre, se borre o no del historial.
2. Actualiza `.env` en todos los entornos (local, VPS, CI) con el valor nuevo y reinicia los servicios afectados.
3. Si ya se hizo push, limpia el historial de git (`git filter-repo` o BFG Repo-Cleaner) y fuerza el push — pero esto es solo higiene del repo, **no sustituye la rotación del paso 1**.
4. Revisa logs de acceso del servicio si el proveedor lo permite, por si el secreto llegó a usarse antes de rotarlo.

**El historial de git nunca es un lugar seguro para nada sensible**, aunque se borre después: puede haber sido clonado, cacheado por forks, indexado por bots o quedar en artefactos de CI antes del borrado.

### Logging

El backend usa [Pino](https://getpino.io) (`src/config/logger.ts`) como logger estructurado. **Nunca loggear información sensible**: passwords, tokens/JWT, números de tarjeta, datos personales identificables (email, dirección, etc.) u otro dato que debiera tratarse como secreto. Si necesitas loggear un objeto que puede contener alguno de estos campos, redáctalo antes de pasarlo al logger.

## Comandos útiles

```bash
# Ejecutar en un workspace específico
pnpm --filter @beatforge/frontend <comando>
pnpm --filter @beatforge/backend <comando>
pnpm --filter @beatforge/shared <comando>

# Build completo (shared primero, luego apps en paralelo)
pnpm build

# Limpiar artefactos
pnpm clean

# Tests (Vitest) en frontend y backend
pnpm test
pnpm --filter @beatforge/frontend test   # solo frontend
pnpm --filter @beatforge/backend test    # solo backend
```

### Migraciones de Prisma

```bash
pnpm --filter @beatforge/backend exec prisma migrate dev --name <nombre>
```

**Nunca** `pnpm --filter @beatforge/backend run db:migrate -- --name <nombre>`:
pnpm reenvía el `--` literal al script (`prisma migrate dev`), Prisma lo
interpreta como fin de flags e ignora `--name` -- `migrate dev` entra
entonces en su prompt interactivo de nombre de migración, que se queda
colgado sin más si el proceso no tiene un TTY (por ejemplo, ejecutado desde
Claude Code). `pnpm exec` no tiene ese problema de doble `--`.
