import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import type { CreateProjectInput, UpdateProjectInput } from '../schemas/project.schema.js';

export async function createProject(req: Request, res: Response): Promise<void> {
  const { name, bpm, key, swing } = req.body as CreateProjectInput;

  const project = await prisma.project.create({
    data: { userId: req.userId!, name, bpm, key, swing },
  });

  res.status(201).json({ project });
}

export async function listProjects(req: Request, res: Response): Promise<void> {
  const projects = await prisma.project.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ projects });
}

export async function getProject(req: Request<{ id: string }>, res: Response): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });

  // 404 tanto si no existe como si es de otro usuario: nunca 403, para no
  // filtrar (vía diferencia de status code) si el recurso existe o no.
  if (!project) {
    res.status(404).json({ error: 'Proyecto no encontrado' });
    return;
  }

  res.status(200).json({ project });
}

export async function updateProject(req: Request<{ id: string }>, res: Response): Promise<void> {
  const data = req.body as UpdateProjectInput;

  const existing = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });

  if (!existing) {
    res.status(404).json({ error: 'Proyecto no encontrado' });
    return;
  }

  const project = await prisma.project.update({
    where: { id: existing.id },
    data,
  });

  res.status(200).json({ project });
}

export async function deleteProject(req: Request<{ id: string }>, res: Response): Promise<void> {
  const existing = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });

  if (!existing) {
    res.status(404).json({ error: 'Proyecto no encontrado' });
    return;
  }

  await prisma.project.delete({ where: { id: existing.id } });
  res.status(204).send();
}
