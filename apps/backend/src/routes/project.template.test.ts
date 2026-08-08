import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { prisma } from '../config/prisma.js';
import {
  type PatternResponseBody,
  type ProjectResponseBody,
  registerUser,
  type TrackResponseBody,
} from '../test-utils/index.js';

// Fichero separado de project.test.ts a propósito: registrar un usuario más
// ahí habría agotado su presupuesto de registerRateLimiter (5 por 15min,
// ver CLAUDE.md > Convenciones de auth) -- cada archivo de test parece
// tener su propia instancia del limiter (import fresco de app.js), así que
// aislar este test en su propio fichero le da presupuesto propio.
describe('Projects: plantilla automática al crear un proyecto', () => {
  const emails: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('crea 3 Tracks (Kick/Bajo/Hi-hat) con Pattern ya audible, no vacío', async () => {
    const { agent, email } = await registerUser(app, 'project-template');
    emails.push(email);

    const projectRes = await agent.post('/api/projects').send({ name: 'Onboarding' });
    const projectId = (projectRes.body as ProjectResponseBody).project!.id;

    const tracksRes = await agent.get(`/api/projects/${projectId}/tracks`);
    const tracks = (tracksRes.body as TrackResponseBody).tracks!;
    expect(tracks).toHaveLength(3);
    expect(tracks.map((t) => t.type).sort()).toEqual(['BASS', 'DRUM', 'HIHAT'].sort());
    // Ni Snare ni Hi-hat abierto en la plantilla por defecto -- se mantiene
    // mínima a propósito (ver project.controller.ts).
    expect(tracks.some((t) => t.type === 'SNARE' || t.type === 'HIHAT_OPEN')).toBe(false);

    for (const track of tracks) {
      const patternsRes = await agent.get(`/api/tracks/${track.id}/patterns`);
      const patterns = (patternsRes.body as PatternResponseBody).patterns!;
      expect(patterns).toHaveLength(1);
      expect(patterns[0].steps).toHaveLength(16);
      // "Audible, no vacío": al menos un step activo -- a diferencia del
      // Pattern vacío que crea un Track añadido a mano (ver
      // track.service.ts), la plantilla del proyecto siempre trae algo
      // que suena nada más darle a Play.
      expect(patterns[0].steps.some((step) => step.active)).toBe(true);
    }
  });
});
