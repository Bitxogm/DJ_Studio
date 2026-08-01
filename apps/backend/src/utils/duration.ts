const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Convierte "15m", "7d", etc. a milisegundos. */
export function parseDurationMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);

  if (!match) {
    throw new Error(`Formato de duración inválido: "${duration}" (usa p.ej. "15m", "7d")`);
  }

  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit];
}
