# BeatForge

Electronic music production studio in the browser.

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
```
