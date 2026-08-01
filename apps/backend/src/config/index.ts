const nodeEnv = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';

export const config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv,
  database: {
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    // Solo para el access token: el refresh token no es un JWT (ver auth.service.ts).
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
  auth: {
    accessCookieName: 'beatforge_access',
    refreshCookieName: 'beatforge_refresh',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  cookies: {
    // Nunca manual: en producción SIEMPRE secure=true, sin excepción posible vía env.
    secure: nodeEnv === 'production',
  },
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 50,
  },
} as const;
