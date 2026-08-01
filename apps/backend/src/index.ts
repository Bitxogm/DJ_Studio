import 'dotenv/config';
import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv, timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  console.log(`[backend] Running on port ${config.port} (${config.nodeEnv})`);
});

export default app;
