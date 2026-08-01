import { Router } from 'express';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from '../controllers/project.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireProjectOwnership } from '../middleware/ownership.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createProjectSchema, updateProjectSchema } from '../schemas/project.schema.js';

export const projectRouter: Router = Router();

projectRouter.use(requireAuth);

projectRouter.post('/', validateBody(createProjectSchema), createProject);
projectRouter.get('/', listProjects);
projectRouter.get('/:projectId', requireProjectOwnership(), getProject);
projectRouter.patch(
  '/:projectId',
  requireProjectOwnership(),
  validateBody(updateProjectSchema),
  updateProject,
);
projectRouter.delete('/:projectId', requireProjectOwnership(), deleteProject);
