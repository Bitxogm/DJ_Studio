import { Router } from 'express';
import * as patternController from '../controllers/pattern.controller.js';
import { requirePatternInTrack } from '../middleware/ownership.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createPatternSchema, updatePatternSchema } from '../schemas/pattern.schema.js';

// Se monta en app.ts bajo /api/tracks/:trackId/patterns (NO bajo /api/projects/:projectId/tracks/:trackId/patterns:
// trackId ya es único globalmente, y anidar un tercer nivel bajo projects solo
// alarga la URL sin aportar nada a la autorización, que se verifica en servidor
// vía la cadena Pattern->Track->Project->User de todos modos).
// requireAuth + requireTrackOwnership ya se aplican donde se monta esta router.
export const patternRouter: Router = Router({ mergeParams: true });

patternRouter.post('/', validateBody(createPatternSchema), patternController.createPattern);
patternRouter.get('/', patternController.listPatterns);
patternRouter.patch(
  '/:patternId',
  requirePatternInTrack(),
  validateBody(updatePatternSchema),
  patternController.updatePattern,
);
patternRouter.delete('/:patternId', requirePatternInTrack(), patternController.deletePattern);
