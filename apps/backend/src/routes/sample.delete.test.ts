import fs from 'fs';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import {
  createMinimalWavBuffer,
  registerUser,
  type SampleResponseBody,
} from '../test-utils/index.js';

describe('Samples: tamaño máximo, listado y borrado físico', () => {
  const emails: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('rechaza un fichero que excede el tamaño máximo configurado', async () => {
    const { agent, email } = await registerUser(app, 'sample-toobig');
    emails.push(email);

    const oversized = Buffer.alloc(config.upload.maxFileSizeMb * 1024 * 1024 + 1024, 0);

    const res = await agent
      .post('/api/samples')
      .attach('file', oversized, { filename: 'huge.wav', contentType: 'audio/wav' });

    expect(res.status).toBe(413);
  });

  it('el borrado elimina el registro y también el fichero físico del disco', async () => {
    const { agent, email } = await registerUser(app, 'sample-delete');
    emails.push(email);
    const wav = createMinimalWavBuffer();

    const uploadRes = await agent
      .post('/api/samples')
      .attach('file', wav, { filename: 'to-delete.wav', contentType: 'audio/wav' });
    const sample = (uploadRes.body as SampleResponseBody).sample!;
    expect(fs.existsSync(sample.storagePath)).toBe(true);

    const deleteRes = await agent.delete(`/api/samples/${sample.id}`);
    expect(deleteRes.status).toBe(204);
    expect(fs.existsSync(sample.storagePath)).toBe(false);

    const stillInDb = await prisma.sample.findUnique({ where: { id: sample.id } });
    expect(stillInDb).toBeNull();
  });

  it('lista solo los samples del usuario autenticado', async () => {
    const { agent, email } = await registerUser(app, 'sample-list');
    emails.push(email);
    const wav = createMinimalWavBuffer();

    const uploadRes = await agent
      .post('/api/samples')
      .attach('file', wav, { filename: 'listed.wav', contentType: 'audio/wav' });
    const sample = (uploadRes.body as SampleResponseBody).sample!;

    const listRes = await agent.get('/api/samples');
    expect(listRes.status).toBe(200);
    expect((listRes.body as SampleResponseBody).samples).toHaveLength(1);

    await prisma.sample.delete({ where: { id: sample.id } });
    fs.unlinkSync(sample.storagePath);
  });
});
