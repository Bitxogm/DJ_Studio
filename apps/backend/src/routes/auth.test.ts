import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../config/prisma.js';
import { type AuthResponseBody, TEST_PASSWORD, uniqueEmail } from '../test-utils/index.js';

describe('Auth: register / login / me', () => {
  const sharedEmail = uniqueEmail('basic');

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: sharedEmail, password: TEST_PASSWORD, displayName: 'Basic User' });
    expect(res.status).toBe(201);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: sharedEmail } });
  });

  it('el registro devuelve el usuario (sin passwordHash) y setea las cookies httpOnly', async () => {
    const email = uniqueEmail('fresh');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: TEST_PASSWORD, displayName: 'Fresh User' });
    const body = res.body as AuthResponseBody;

    expect(res.status).toBe(201);
    expect(body.user?.email).toBe(email);
    expect(body.user).not.toHaveProperty('passwordHash');

    const setCookie = res.headers['set-cookie'] as unknown as string[];
    expect(setCookie.some((c) => c.startsWith('beatforge_access=') && c.includes('HttpOnly'))).toBe(
      true,
    );
    expect(
      setCookie.some((c) => c.startsWith('beatforge_refresh=') && c.includes('HttpOnly')),
    ).toBe(true);

    await prisma.user.deleteMany({ where: { email } });
  });

  it('rechaza el registro con un email ya usado', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: sharedEmail, password: TEST_PASSWORD, displayName: 'Otra vez' });

    expect(res.status).toBe(409);
  });

  it('login exitoso devuelve los datos del usuario', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: sharedEmail, password: TEST_PASSWORD });
    const body = res.body as AuthResponseBody;

    expect(res.status).toBe(200);
    expect(body.user?.email).toBe(sharedEmail);
  });

  it('login rechaza credenciales inválidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: sharedEmail, password: 'contraseña-incorrecta' });

    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me sin token devuelve 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
