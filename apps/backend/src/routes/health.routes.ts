import { Router } from 'express';
import { prisma } from '../config/prisma.js';

export const healthRouter: Router = Router();

healthRouter.get('/', async (_req, res) => {
  let database: 'connected' | 'error';

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'connected';
  } catch {
    database = 'error';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database,
  });
});
