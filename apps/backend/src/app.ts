import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { healthRouter } from './routes/health.routes.js';

export const app: Application = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/health', healthRouter);
