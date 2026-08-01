import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../config/prisma.js';
import { type AuthResponseBody, TEST_PASSWORD, uniqueEmail } from '../test-utils/index.js';

// Archivo separado a propósito: cada test file tiene su propia instancia de `app`
// (y por tanto su propio contador del rate limiter de /api/auth/register), así que
// aquí podemos hacer varios registros sin acercarnos al límite de 5/15min.
describe('Auth: flujo completo y rotación de refresh token', () => {
  const emails: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('register -> me -> refresh (rota el token) -> logout', async () => {
    const agent = request.agent(app);
    const email = uniqueEmail('flow');
    emails.push(email);

    const registerRes = await agent
      .post('/api/auth/register')
      .send({ email, password: TEST_PASSWORD, displayName: 'Flow User' });
    expect(registerRes.status).toBe(201);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect((meRes.body as AuthResponseBody).user?.email).toBe(email);

    const sessionBeforeRefresh = await prisma.session.findFirstOrThrow({
      where: { user: { email } },
    });

    const refreshRes = await agent.post('/api/auth/refresh');
    expect(refreshRes.status).toBe(200);

    // Rotación: la sesión vieja queda revocada y hay una sesión nueva activa.
    const oldSession = await prisma.session.findUniqueOrThrow({
      where: { id: sessionBeforeRefresh.id },
    });
    expect(oldSession.revokedAt).not.toBeNull();

    const activeSessions = await prisma.session.findMany({
      where: { user: { email }, revokedAt: null },
    });
    expect(activeSessions).toHaveLength(1);
    expect(activeSessions[0]?.id).not.toBe(sessionBeforeRefresh.id);

    // El agent ya lleva las cookies nuevas (access + refresh rotado): sigue autenticado.
    const meAfterRefresh = await agent.get('/api/auth/me');
    expect(meAfterRefresh.status).toBe(200);

    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(204);

    // Tras logout la sesión activa quedó revocada: refresh debe rechazarse.
    const refreshAfterLogout = await agent.post('/api/auth/refresh');
    expect(refreshAfterLogout.status).toBe(401);
  });

  it('rechaza refresh cuando la sesión ya está revocada', async () => {
    const agent = request.agent(app);
    const email = uniqueEmail('revoked');
    emails.push(email);

    await agent
      .post('/api/auth/register')
      .send({ email, password: TEST_PASSWORD, displayName: 'Revoked User' });

    const session = await prisma.session.findFirstOrThrow({ where: { user: { email } } });
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

    const res = await agent.post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('rechaza refresh cuando la sesión ya expiró', async () => {
    const agent = request.agent(app);
    const email = uniqueEmail('expired');
    emails.push(email);

    await agent
      .post('/api/auth/register')
      .send({ email, password: TEST_PASSWORD, displayName: 'Expired User' });

    const session = await prisma.session.findFirstOrThrow({ where: { user: { email } } });
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await agent.post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});
