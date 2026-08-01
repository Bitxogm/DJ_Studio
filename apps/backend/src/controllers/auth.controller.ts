import type { Request, Response } from 'express';
import type { User as SharedUser } from '@beatforge/shared';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';
import {
  createSession,
  findActiveSessionByRefreshToken,
  generateAccessToken,
  hashPassword,
  revokeSession,
  rotateSession,
  verifyPassword,
} from '../services/auth.service.js';
import { parseDurationMs } from '../utils/duration.js';

interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

function toPublicUser(user: UserRecord): SharedUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.cookies.secure,
  sameSite: 'strict' as const,
  path: '/',
};

// Restringida a /api/auth (no solo /api/auth/refresh, como en el diseño original):
// logout también necesita leer esta cookie para saber qué sesión revocar, y el
// navegador solo adjunta una cookie si el path de la request coincide con su path.
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.cookies.secure,
  sameSite: 'strict' as const,
  path: '/api/auth',
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(config.auth.accessCookieName, accessToken, {
    ...ACCESS_COOKIE_OPTIONS,
    maxAge: parseDurationMs(config.jwt.expiresIn),
  });
  res.cookie(config.auth.refreshCookieName, refreshToken, {
    ...REFRESH_COOKIE_OPTIONS,
    maxAge: parseDurationMs(config.auth.refreshTokenExpiresIn),
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(config.auth.accessCookieName, ACCESS_COOKIE_OPTIONS);
  res.clearCookie(config.auth.refreshCookieName, REFRESH_COOKIE_OPTIONS);
}

function getSessionMeta(req: Request): { userAgent?: string; ipAddress?: string } {
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, displayName } = req.body as RegisterInput;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Ese email ya está registrado' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash, displayName } });
  const { refreshToken } = await createSession(user.id, getSessionMeta(req));
  const accessToken = generateAccessToken(user.id);

  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ user: toPublicUser(user) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    res.status(401).json({ error: 'Credenciales inválidas' });
    return;
  }

  const { refreshToken } = await createSession(user.id, getSessionMeta(req));
  const accessToken = generateAccessToken(user.id);

  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json({ user: toPublicUser(user) });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const cookies = req.cookies as Record<string, string | undefined>;
  const refreshToken = cookies[config.auth.refreshCookieName];

  if (!refreshToken) {
    res.status(401).json({ error: 'No hay sesión activa' });
    return;
  }

  const session = await findActiveSessionByRefreshToken(refreshToken);
  if (!session) {
    clearAuthCookies(res);
    res.status(401).json({ error: 'Sesión inválida o expirada' });
    return;
  }

  const rotated = await rotateSession(session.id, session.userId, getSessionMeta(req));
  const accessToken = generateAccessToken(session.userId);

  setAuthCookies(res, accessToken, rotated.refreshToken);
  res.status(200).json({ ok: true });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const cookies = req.cookies as Record<string, string | undefined>;
  const refreshToken = cookies[config.auth.refreshCookieName];

  if (refreshToken) {
    const session = await findActiveSessionByRefreshToken(refreshToken);
    if (session) {
      await revokeSession(session.id);
    }
  }

  clearAuthCookies(res);
  res.status(204).send();
}

export async function me(req: Request, res: Response): Promise<void> {
  // requireAuth ya garantiza que req.userId está definido en esta ruta.
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });

  if (!user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  res.status(200).json({ user: toPublicUser(user) });
}
