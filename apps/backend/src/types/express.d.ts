import type {
  PatternModel,
  ProjectModel,
  SampleModel,
  TrackModel,
} from '../generated/prisma/models.js';

// Declaration merging: adjunta al Request los recursos ya verificados por los
// middlewares de auth/ownership, para no volver a consultarlos en el controller.
// Todos opcionales: solo están presentes tras pasar por su middleware correspondiente.
declare global {
  namespace Express {
    interface Request {
      /** Del access token verificado (requireAuth). */
      userId?: string;
      /** De requireProjectOwnership. */
      project?: ProjectModel;
      /** De requireTrackOwnership / requireTrackInProject. */
      track?: TrackModel;
      /** De requirePatternInTrack. */
      pattern?: PatternModel;
      /** De requireSampleOwnership. */
      sample?: SampleModel;
    }
  }
}

export {};
