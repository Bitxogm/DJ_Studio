import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { prisma } from '../config/prisma.js';
import {
  type ProjectResponseBody,
  registerUser,
  type TrackResponseBody,
} from '../test-utils/index.js';

describe('Tracks: ownership cruzado entre usuarios', () => {
  const emails: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('un usuario no puede crear, editar ni borrar Tracks del Project de otro usuario', async () => {
    const owner = await registerUser(app, 'track-cross-owner');
    const attacker = await registerUser(app, 'track-cross-attacker');
    emails.push(owner.email, attacker.email);

    const projectRes = await owner.agent.post('/api/projects').send({ name: 'Privado de A' });
    const projectId = (projectRes.body as ProjectResponseBody).project!.id;

    const trackRes = await owner.agent.post(`/api/projects/${projectId}/tracks`).send({
      name: 'Bajo',
      type: 'BASS',
      order: 0,
      instrumentConfig: {},
    });
    const trackId = (trackRes.body as TrackResponseBody).track!.id;

    // B no puede ni crear un Track dentro del Project de A: falla ya en requireProjectOwnership.
    const createAsAttacker = await attacker.agent
      .post(`/api/projects/${projectId}/tracks`)
      .send({ name: 'Hack', type: 'BASS', order: 1, instrumentConfig: {} });
    expect(createAsAttacker.status).toBe(404);

    const patchAsAttacker = await attacker.agent
      .patch(`/api/projects/${projectId}/tracks/${trackId}`)
      .send({ name: 'Hackeado' });
    expect(patchAsAttacker.status).toBe(404);

    const deleteAsAttacker = await attacker.agent.delete(
      `/api/projects/${projectId}/tracks/${trackId}`,
    );
    expect(deleteAsAttacker.status).toBe(404);

    // El track de A sigue intacto tras los intentos de B.
    const listRes = await owner.agent.get(`/api/projects/${projectId}/tracks`);
    const tracks = (listRes.body as TrackResponseBody).tracks!;
    expect(tracks.find((t) => t.id === trackId)?.name).toBe('Bajo');
  });
});
