import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

// Archivo separado a propósito: necesita una instancia de `app` (y de su limiter)
// virgen, sin intentos de login previos de otros tests consumiendo la ventana.
describe('Rate limiting en /api/auth/login', () => {
  it('el 6º intento en la ventana de 15 min devuelve 429', async () => {
    const credentials = { email: 'no-existe@example.com', password: 'lo-que-sea' };

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/auth/login').send(credentials);
      expect(res.status).toBe(401);
    }

    const sixth = await request(app).post('/api/auth/login').send(credentials);
    expect(sixth.status).toBe(429);
  });
});
