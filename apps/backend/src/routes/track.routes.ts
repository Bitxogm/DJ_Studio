import { Router } from 'express';
import * as trackController from '../controllers/track.controller.js';
import { requireTrackInProject } from '../middleware/ownership.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createTrackSchema, updateTrackSchema } from '../schemas/track.schema.js';

// Se monta en app.ts bajo /api/projects/:projectId/tracks, donde ya se aplican
// requireAuth + requireProjectOwnership. mergeParams hereda :projectId de ahí.
export const trackRouter: Router = Router({ mergeParams: true });

trackRouter.post('/', validateBody(createTrackSchema), trackController.createTrack);
trackRouter.get('/', trackController.listTracks);
trackRouter.patch(
  '/:trackId',
  requireTrackInProject(),
  validateBody(updateTrackSchema),
  trackController.updateTrack,
);
trackRouter.delete('/:trackId', requireTrackInProject(), trackController.deleteTrack);
