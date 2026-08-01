import rateLimit from 'express-rate-limit';

// Limiter estricto solo para login/register (fuerza bruta de credenciales).
// Instancias separadas: agotar los intentos de login no debe bloquear el registro, y viceversa.
function authAttemptLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: 'Demasiados intentos. Inténtalo de nuevo más tarde.' });
    },
  });
}

export const loginRateLimiter = authAttemptLimiter();
export const registerRateLimiter = authAttemptLimiter();
