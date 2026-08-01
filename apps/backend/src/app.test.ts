import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './app.js';

interface HealthResponse {
  status: string;
  uptime: number;
  database: string;
}

describe('GET /api/health', () => {
  it('responde 200 con status ok y confirma conexión real a la BD', async () => {
    const res = await request(app).get('/api/health');
    const body = res.body as HealthResponse;

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
    expect(body.database).toBe('connected');
  });
});
