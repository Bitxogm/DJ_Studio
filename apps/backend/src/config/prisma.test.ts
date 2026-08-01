import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from './prisma.js';

describe('Prisma', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('conecta con la base de datos y ejecuta una query simple', async () => {
    const result = await prisma.$queryRaw<{ result: number }[]>`SELECT 1 as result`;

    expect(result[0]?.result).toBe(1);
  });
});
