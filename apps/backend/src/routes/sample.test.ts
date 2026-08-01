import fs from 'fs';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { prisma } from '../config/prisma.js';
import {
  createFakeExecutableBuffer,
  createMinimalWavBuffer,
  registerUser,
  type SampleResponseBody,
} from '../test-utils/index.js';

describe('Samples: subida y validación de contenido', () => {
  const emails: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('sube un WAV real y crea el registro Sample', async () => {
    const { agent, email } = await registerUser(app, 'sample-owner');
    emails.push(email);
    const wav = createMinimalWavBuffer();

    const res = await agent
      .post('/api/samples')
      .attach('file', wav, { filename: 'kick.wav', contentType: 'audio/wav' });

    expect(res.status).toBe(201);
    const sample = (res.body as SampleResponseBody).sample!;
    expect(sample.originalName).toBe('kick.wav');
    expect(sample.mimeType).toBe('audio/wav');
    expect(sample.sizeBytes).toBe(wav.length);
    // Nombre generado (UUID), nunca el original.
    expect(sample.filename).not.toBe('kick.wav');
    expect(fs.existsSync(sample.storagePath)).toBe(true);

    await prisma.sample.delete({ where: { id: sample.id } });
    fs.unlinkSync(sample.storagePath);
  });

  it('rechaza un mimetype no permitido', async () => {
    const { agent, email } = await registerUser(app, 'sample-badmime');
    emails.push(email);

    const res = await agent.post('/api/samples').attach('file', createFakeExecutableBuffer(), {
      filename: 'evil.exe',
      contentType: 'application/x-msdownload',
    });

    expect(res.status).toBe(400);
  });

  it('rechaza un fichero cuyo contenido no coincide con el mimetype declarado', async () => {
    const { agent, email } = await registerUser(app, 'sample-spoofed');
    emails.push(email);

    // mimetype declarado válido (audio/wav) pero el contenido no es un WAV real.
    const res = await agent
      .post('/api/samples')
      .attach('file', createFakeExecutableBuffer(), {
        filename: 'fake.wav',
        contentType: 'audio/wav',
      });

    expect(res.status).toBe(400);
  });
});
