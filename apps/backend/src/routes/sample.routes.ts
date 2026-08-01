import { Router } from 'express';
import * as sampleController from '../controllers/sample.controller.js';
import { requireSampleOwnership } from '../middleware/ownership.middleware.js';
import { handleUploadErrors, uploadSample } from '../middleware/upload.middleware.js';

// NO anidado bajo /api/projects: un Sample es del usuario, reutilizable entre
// proyectos/tracks. requireAuth se aplica donde se monta esta router en app.ts.
export const sampleRouter: Router = Router();

sampleRouter.post(
  '/',
  uploadSample.single('file'),
  handleUploadErrors,
  sampleController.uploadSampleFile,
);
sampleRouter.get('/', sampleController.listSamples);
sampleRouter.delete('/:id', requireSampleOwnership(), sampleController.deleteSampleFile);
sampleRouter.get('/:id/file', requireSampleOwnership(), sampleController.streamSampleFile);
