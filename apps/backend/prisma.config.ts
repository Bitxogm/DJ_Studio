import path from 'path';
import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// La CLI de Prisma ejecuta este fichero con cwd=apps/backend; el .env real
// vive en la raíz del monorepo (mismo motivo que en src/config/env.ts).
loadEnv({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // SOLO usuarios/datos de desarrollo (ver prisma/seed.ts) — el propio
    // script se niega a ejecutarse si NODE_ENV=production.
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
