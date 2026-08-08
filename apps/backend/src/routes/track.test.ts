import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { prisma } from '../config/prisma.js';
import {
  type PatternResponseBody,
  type ProjectResponseBody,
  registerUser,
  type TrackResponseBody,
} from '../test-utils/index.js';

describe('Tracks: creación, listado y 404 en cascada', () => {
  const emails: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('crea y lista tracks de un proyecto propio', async () => {
    const { agent, email } = await registerUser(app, 'track-owner');
    emails.push(email);

    const projectRes = await agent.post('/api/projects').send({ name: 'Mi proyecto' });
    const projectId = (projectRes.body as ProjectResponseBody).project!.id;

    const createRes = await agent.post(`/api/projects/${projectId}/tracks`).send({
      name: 'Kick',
      type: 'DRUM',
      order: 0,
      instrumentConfig: { synth: 'kick808' },
    });

    expect(createRes.status).toBe(201);
    const track = (createRes.body as TrackResponseBody).track!;
    expect(track.projectId).toBe(projectId);
    expect(track.volume).toBe(0.8);
    expect(track.muted).toBe(false);

    // No se comprueba la longitud total: el proyecto ya nace con 3 Tracks de
    // plantilla (Kick/Bajo/Hi-hat, ver project.controller.ts), así que aquí
    // hay 4 en total -- lo que importa es que el Track creado a mano aparezca.
    const listRes = await agent.get(`/api/projects/${projectId}/tracks`);
    expect(listRes.status).toBe(200);
    const tracks = (listRes.body as TrackResponseBody).tracks!;
    expect(tracks.some((t) => t.id === track.id)).toBe(true);
  });

  it('un Track recién creado ya trae su propio Pattern vacío (nunca se queda bloqueado sin ninguno)', async () => {
    const { agent, email } = await registerUser(app, 'track-autopattern');
    emails.push(email);

    const projectRes = await agent.post('/api/projects').send({ name: 'Mi proyecto' });
    const projectId = (projectRes.body as ProjectResponseBody).project!.id;

    const createRes = await agent.post(`/api/projects/${projectId}/tracks`).send({
      name: 'Kick',
      type: 'DRUM',
      order: 0,
      instrumentConfig: {},
    });
    const track = (createRes.body as TrackResponseBody).track!;

    const listRes = await agent.get(`/api/tracks/${track.id}/patterns`);
    expect(listRes.status).toBe(200);
    const patterns = (listRes.body as PatternResponseBody).patterns!;
    expect(patterns).toHaveLength(1);
    expect(patterns[0].steps).toHaveLength(16);
    expect(patterns[0].steps.every((step) => step.active === false)).toBe(true);
  });

  it('404 si el Project no existe (ni siquiera llega a mirar el Track)', async () => {
    const { agent, email } = await registerUser(app, 'track-noproject');
    emails.push(email);

    const res = await agent.post('/api/projects/proyecto-inexistente/tracks').send({
      name: 'Kick',
      type: 'DRUM',
      order: 0,
      instrumentConfig: {},
    });

    expect(res.status).toBe(404);
  });

  it('404 si el Track no existe dentro de un Project que sí es válido', async () => {
    const { agent, email } = await registerUser(app, 'track-notrack');
    emails.push(email);

    const projectRes = await agent.post('/api/projects').send({ name: 'P' });
    const projectId = (projectRes.body as ProjectResponseBody).project!.id;

    const res = await agent
      .patch(`/api/projects/${projectId}/tracks/track-inexistente`)
      .send({ name: 'x' });

    expect(res.status).toBe(404);
  });
});
