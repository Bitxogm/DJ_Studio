import { createHash, randomBytes } from 'crypto';
import argon2 from 'argon2';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { parseDurationMs } from '../utils/duration.js';

export interface AccessTokenPayload {
  sub: string;
}

export interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

// ─── Contraseñas ────────────────────────────────────────────────────────────
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

// ─── Access token (JWT) ─────────────────────────────────────────────────────
export function generateAccessToken(userId: string): string {
  const options: SignOptions = { expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId }, config.jwt.secret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (typeof decoded === 'object' && decoded !== null && typeof decoded.sub === 'string') {
      return { sub: decoded.sub };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Refresh token (string aleatorio, NO JWT) ───────────────────────────────
// Un refresh token es un valor aleatorio de 512 bits (alta entropía), no una
// contraseña de baja entropía elegida por un humano. Argon2 está pensado para
// ralentizar deliberadamente el hasheo frente a fuerza bruta sobre ese segundo
// caso; aplicado aquí solo añadiría coste de CPU en cada refresh sin ganancia
// de seguridad real. SHA-256 (determinista, rápido) es suficiente y correcto.
export function generateRefreshToken(): string {
  return randomBytes(64).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, meta: SessionMeta = {}) {
  const refreshToken = generateRefreshToken();

  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt: new Date(Date.now() + parseDurationMs(config.auth.refreshTokenExpiresIn)),
    },
  });

  return { session, refreshToken };
}

export async function findActiveSessionByRefreshToken(refreshToken: string) {
  const session = await prisma.session.findFirst({
    where: { refreshTokenHash: hashRefreshToken(refreshToken) },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  return session;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

/** Rotación obligatoria: revoca la sesión vieja y crea una nueva en una transacción atómica. */
export async function rotateSession(oldSessionId: string, userId: string, meta: SessionMeta = {}) {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + parseDurationMs(config.auth.refreshTokenExpiresIn));

  const [, session] = await prisma.$transaction([
    prisma.session.update({
      where: { id: oldSessionId },
      data: { revokedAt: new Date() },
    }),
    prisma.session.create({
      data: {
        userId,
        refreshTokenHash: hashRefreshToken(refreshToken),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt,
      },
    }),
  ]);

  return { session, refreshToken };
}
