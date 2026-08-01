import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../config/prisma.js';
import { type ProjectResponseBody, TEST_PASSWORD, uniqueEmail } from '../test-utils/index.js';

describe('Projects: pertenencia y CRUD', () => {
  const emails: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('un usuario no puede ver, editar ni borrar proyectos de otro usuario (404, nunca 403)', async () => {
    const agentA = request.agent(app);
    const agentB = request.agent(app);
    const emailA = uniqueEmail('owner-a');
    const emailB = uniqueEmail('owner-b');
    emails.push(emailA, emailB);

    await agentA
      .post('/api/auth/register')
      .send({ email: emailA, password: TEST_PASSWORD, displayName: 'Owner A' });
    await agentB
      .post('/api/auth/register')
      .send({ email: emailB, password: TEST_PASSWORD, displayName: 'Owner B' });

    const createRes = await agentA.post('/api/projects').send({ name: 'Track de A' });
    expect(createRes.status).toBe(201);
    const projectId = (createRes.body as ProjectResponseBody).project!.id;

    const getAsB = await agentB.get(`/api/projects/${projectId}`);
    expect(getAsB.status).toBe(404);

    const patchAsB = await agentB.patch(`/api/projects/${projectId}`).send({ name: 'Hackeado' });
    expect(patchAsB.status).toBe(404);

    const deleteAsB = await agentB.delete(`/api/projects/${projectId}`);
    expect(deleteAsB.status).toBe(404);

    // El proyecto de A sigue intacto tras los intentos de B.
    const getAsA = await agentA.get(`/api/projects/${projectId}`);
    expect(getAsA.status).toBe(200);
    expect((getAsA.body as ProjectResponseBody).project?.name).toBe('Track de A');
  });

  it('lista solo los proyectos del usuario autenticado', async () => {
    const agentA = request.agent(app);
    const agentB = request.agent(app);
    const emailA = uniqueEmail('list-a');
    const emailB = uniqueEmail('list-b');
    emails.push(emailA, emailB);

    await agentA
      .post('/api/auth/register')
      .send({ email: emailA, password: TEST_PASSWORD, displayName: 'Lister A' });
    await agentB
      .post('/api/auth/register')
      .send({ email: emailB, password: TEST_PASSWORD, displayName: 'Lister B' });

    await agentA.post('/api/projects').send({ name: 'A1' });
    await agentA.post('/api/projects').send({ name: 'A2' });
    await agentB.post('/api/projects').send({ name: 'B1' });

    const res = await agentA.get('/api/projects');
    const body = res.body as ProjectResponseBody;

    expect(res.status).toBe(200);
    expect(body.projects).toHaveLength(2);
    expect(body.projects?.every((p) => p.userId !== undefined)).toBe(true);
  });

  it('POST /api/projects sin autenticar devuelve 401', async () => {
    const res = await request(app).post('/api/projects').send({ name: 'Sin auth' });
    expect(res.status).toBe(401);
  });

  it('crea un proyecto con el bpm por defecto cuando no se especifica', async () => {
    const agent = request.agent(app);
    const email = uniqueEmail('default-bpm');
    emails.push(email);
    await agent
      .post('/api/auth/register')
      .send({ email, password: TEST_PASSWORD, displayName: 'Default Bpm' });

    const res = await agent.post('/api/projects').send({ name: 'Sin bpm' });
    const body = res.body as ProjectResponseBody;

    expect(res.status).toBe(201);
    expect(body.project?.bpm).toBe(120);
  });
});
