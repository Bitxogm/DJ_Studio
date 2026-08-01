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
