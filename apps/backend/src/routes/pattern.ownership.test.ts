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

describe('Patterns: ownership en cadena de 3 niveles (Pattern->Track->Project->User)', () => {
  const emails: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('un usuario no puede crear, editar ni borrar Patterns de un Track que no es suyo', async () => {
    const owner = await registerUser(app, 'pattern-cross-owner');
    const attacker = await registerUser(app, 'pattern-cross-attacker');
    emails.push(owner.email, attacker.email);

    const project = await createProjectFor(owner.agent);
    const track = await createTrackFor(owner.agent, project.id);

    const patternRes = await owner.agent.post(`/api/tracks/${track.id}/patterns`).send({
      name: 'Pattern de A',
      steps: defaultSteps(),
      timelinePosition: 0,
    });
    const patternId = (patternRes.body as PatternResponseBody).pattern!.id;

    // El track es de A: B no puede ni crear un pattern ahí (falla en requireTrackOwnership).
    const createAsAttacker = await attacker.agent
      .post(`/api/tracks/${track.id}/patterns`)
      .send({ name: 'Hack', steps: defaultSteps(), timelinePosition: 1 });
    expect(createAsAttacker.status).toBe(404);

    const patchAsAttacker = await attacker.agent
      .patch(`/api/tracks/${track.id}/patterns/${patternId}`)
      .send({ name: 'Hackeado' });
    expect(patchAsAttacker.status).toBe(404);

    const deleteAsAttacker = await attacker.agent.delete(
      `/api/tracks/${track.id}/patterns/${patternId}`,
    );
    expect(deleteAsAttacker.status).toBe(404);

    const listRes = await owner.agent.get(`/api/tracks/${track.id}/patterns`);
    const patterns = (listRes.body as PatternResponseBody).patterns!;
    expect(patterns.find((p) => p.id === patternId)?.name).toBe('Pattern de A');
  });
});
