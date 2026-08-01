import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { config } from './index.js';

// Evita crear múltiples PrismaClient/pools en dev con hot-reload (tsx watch):
// se cachea la instancia en globalThis y se reutiliza entre recargas.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: config.database.url });

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (config.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}
