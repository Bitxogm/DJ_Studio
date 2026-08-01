import path from 'path';
import { config as loadEnv } from 'dotenv';

// pnpm ejecuta los scripts con cwd=apps/backend, nunca en la raíz del monorepo:
// `dotenv/config` a secas no encontraría el .env raíz. Debe ser el PRIMER
// import de index.ts (los imports se resuelven en orden entre sí, antes que
// cualquier otro código del módulo) para que el resto de módulos vea las vars.
loadEnv({ path: path.resolve(__dirname, '../../../../.env') });
