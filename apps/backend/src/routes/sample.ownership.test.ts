import fs from 'fs';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { prisma } from '../config/prisma.js';
import {
  createMinimalWavBuffer,
  registerUser,
  type SampleResponseBody,
} from '../test-utils/index.js';

describe('Samples: ownership cruzado', () => {
  const emails: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('un usuario no puede descargar ni borrar el sample de otro (404, no 403)', async () => {
    const owner = await registerUser(app, 'sample-cross-owner');
    const attacker = await registerUser(app, 'sample-cross-attacker');
    emails.push(owner.email, attacker.email);

    const uploadRes = await owner.agent
      .post('/api/samples')
      .attach('file', createMinimalWavBuffer(), {
        filename: 'privado.wav',
        contentType: 'audio/wav',
      });
    const sample = (uploadRes.body as SampleResponseBody).sample!;

    const downloadAsAttacker = await attacker.agent.get(`/api/samples/${sample.id}/file`);
    expect(downloadAsAttacker.status).toBe(404);

    const deleteAsAttacker = await attacker.agent.delete(`/api/samples/${sample.id}`);
    expect(deleteAsAttacker.status).toBe(404);

    // Sigue existiendo para su dueño real tras los intentos de B.
    const downloadAsOwner = await owner.agent.get(`/api/samples/${sample.id}/file`);
    expect(downloadAsOwner.status).toBe(200);

    await prisma.sample.delete({ where: { id: sample.id } });
    fs.unlinkSync(sample.storagePath);
  });
});
