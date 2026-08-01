import './config/env.js';
import { app } from './app.js';
import { config } from './config/index.js';
import { logger } from './config/logger.js';

app.listen(config.port, () => {
  logger.info(`Running on port ${config.port} (${config.nodeEnv})`);
});
