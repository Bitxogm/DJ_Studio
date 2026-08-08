import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { prisma } from '../config/prisma.js';
import {
  createProjectFor,
  createTrackFor,
  defaultSteps,
  type PatternResponseBody,
  registerUser,
} from '../test-utils/index.js';

describe('Patterns: creación y validación de steps', () => {
  const emails: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('crea un pattern con 16 steps válidos y lo lista', async () => {
    const { agent, email } = await registerUser(app, 'pattern-owner');
    emails.push(email);
    const project = await createProjectFor(agent);
    const track = await createTrackFor(agent, project.id);

    const createRes = await agent.post(`/api/tracks/${track.id}/patterns`).send({
      name: 'Pattern A',
      steps: defaultSteps(),
      timelinePosition: 0,
    });

    expect(createRes.status).toBe(201);
    const pattern = (createRes.body as PatternResponseBody).pattern!;
    expect(pattern.trackId).toBe(track.id);
    expect(pattern.steps).toHaveLength(16);
    expect(pattern.lengthInBars).toBe(1);

    // No se comprueba la longitud total de la lista: createTrackFor ya deja
    // un Pattern propio (el Track nace con uno vacío, ver track.service.ts),
    // así que aquí hay 2 en total -- lo que importa es que el que acabamos
    // de crear aparezca, no cuántos hay.
    const listRes = await agent.get(`/api/tracks/${track.id}/patterns`);
    expect(listRes.status).toBe(200);
    const patterns = (listRes.body as PatternResponseBody).patterns!;
    expect(patterns.some((p) => p.id === pattern.id)).toBe(true);
  });

  it('rechaza steps con velocity fuera de rango (0-1)', async () => {
    const { agent, email } = await registerUser(app, 'pattern-badvelocity');
    emails.push(email);
    const project = await createProjectFor(agent);
    const track = await createTrackFor(agent, project.id);

    const steps = defaultSteps();
    steps[0].velocity = 1.5;

    const res = await agent
      .post(`/api/tracks/${track.id}/patterns`)
      .send({ name: 'Bad', steps, timelinePosition: 0 });

    expect(res.status).toBe(400);
  });

  it('rechaza un array de steps que no tenga exactamente 16 posiciones', async () => {
    const { agent, email } = await registerUser(app, 'pattern-badlength');
    emails.push(email);
    const project = await createProjectFor(agent);
    const track = await createTrackFor(agent, project.id);

    const res = await agent
      .post(`/api/tracks/${track.id}/patterns`)
      .send({ name: 'Bad', steps: defaultSteps().slice(0, 8), timelinePosition: 0 });

    expect(res.status).toBe(400);
  });

  it('rechaza un step con campos faltantes', async () => {
    const { agent, email } = await registerUser(app, 'pattern-badshape');
    emails.push(email);
    const project = await createProjectFor(agent);
    const track = await createTrackFor(agent, project.id);

    const steps = defaultSteps().map((s, i) => (i === 0 ? { active: true } : s));

    const res = await agent
      .post(`/api/tracks/${track.id}/patterns`)
      .send({ name: 'Bad', steps, timelinePosition: 0 });

    expect(res.status).toBe(400);
  });
});
