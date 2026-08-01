import type { NextFunction, Request, Response } from 'express';
import { config } from '../config/index.js';
import { verifyAccessToken } from '../services/auth.service.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies as Record<string, string | undefined> | undefined;
  const accessToken = token?.[config.auth.accessCookieName];

  if (!accessToken) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  const payload = verifyAccessToken(accessToken);

  if (!payload) {
    res.status(401).json({ error: 'Token inválido o expirado' });
    return;
  }

  req.userId = payload.sub;
  next();
}
