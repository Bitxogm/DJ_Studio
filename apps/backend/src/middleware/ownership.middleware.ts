import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

// Verificación de pertenencia en cadena: cada middleware confirma un salto de la
// relación (Project->User, Track->Project->User, Pattern->Track->Project->User,
// Sample->User) y adjunta el recurso ya cargado a req para que el controller no
// tenga que volver a consultarlo. Siempre 404 si no existe o es de otro usuario
// (nunca 403), para no filtrar si el recurso existe.

export function requireProjectOwnership(paramName = 'projectId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const id = req.params[paramName] as string;
    const project = await prisma.project.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!project) {
      res.status(404).json({ error: 'Proyecto no encontrado' });
      return;
    }

    req.project = project;
    next();
  };
}

/** Requiere que requireProjectOwnership ya haya corrido antes (usa req.project). */
export function requireTrackInProject(paramName = 'trackId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const id = req.params[paramName] as string;
    const track = await prisma.track.findFirst({
      where: { id, projectId: req.project!.id },
    });

    if (!track) {
      res.status(404).json({ error: 'Track no encontrado' });
      return;
    }

    req.track = track;
    next();
  };
}

/**
 * Verificación standalone de Track (2 saltos: Track->Project->User), para rutas
 * que no cuelgan de /api/projects/:projectId (p.ej. /api/tracks/:trackId/patterns).
 */
export function requireTrackOwnership(paramName = 'trackId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const id = req.params[paramName] as string;
    const track = await prisma.track.findFirst({
      where: { id, project: { userId: req.userId! } },
    });

    if (!track) {
      res.status(404).json({ error: 'Track no encontrado' });
      return;
    }

    req.track = track;
    next();
  };
}

/** Requiere que requireTrackOwnership (o requireTrackInProject) ya haya corrido antes. */
export function requirePatternInTrack(paramName = 'patternId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const id = req.params[paramName] as string;
    const pattern = await prisma.pattern.findFirst({
      where: { id, trackId: req.track!.id },
    });

    if (!pattern) {
      res.status(404).json({ error: 'Pattern no encontrado' });
      return;
    }

    req.pattern = pattern;
    next();
  };
}

/** Sample no cuelga de Project: pertenece directamente al usuario (1 salto). */
export function requireSampleOwnership(paramName = 'id') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const id = req.params[paramName] as string;
    const sample = await prisma.sample.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!sample) {
      res.status(404).json({ error: 'Sample no encontrado' });
      return;
    }

    req.sample = sample;
    next();
  };
}
