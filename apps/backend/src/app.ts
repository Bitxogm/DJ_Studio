import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import { config } from './config/index.js';
import { requireAuth } from './middleware/auth.middleware.js';
import {
  requireProjectOwnership,
  requireTrackOwnership,
} from './middleware/ownership.middleware.js';
import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { patternRouter } from './routes/pattern.routes.js';
import { projectRouter } from './routes/project.routes.js';
import { sampleRouter } from './routes/sample.routes.js';
import { trackRouter } from './routes/track.routes.js';

export const app: Application = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);

// Track cuelga de Project (ownership en cadena Track->Project->User): se verifica
// primero la pertenencia del Project (por :projectId) antes de entrar a trackRouter.
app.use('/api/projects/:projectId/tracks', requireAuth, requireProjectOwnership(), trackRouter);

// Pattern NO cuelga de /api/projects/:projectId/tracks/:trackId (evita anidar un
// 4º nivel en la URL): trackId ya es único globalmente y la autorización se
// verifica igualmente en servidor vía la cadena Pattern->Track->Project->User.
app.use('/api/tracks/:trackId/patterns', requireAuth, requireTrackOwnership(), patternRouter);

// Sample no cuelga de Project: pertenece directamente al usuario.
app.use('/api/samples', requireAuth, sampleRouter);
