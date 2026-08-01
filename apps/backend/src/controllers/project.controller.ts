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

// GET/PATCH/DELETE pasan antes por requireProjectOwnership: req.project ya está
// verificado y cargado, no hace falta volver a consultarlo aquí.
export function getProject(req: Request, res: Response): void {
  res.status(200).json({ project: req.project });
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  const data = req.body as UpdateProjectInput;

  const project = await prisma.project.update({
    where: { id: req.project!.id },
    data,
  });

  res.status(200).json({ project });
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  await prisma.project.delete({ where: { id: req.project!.id } });
  res.status(204).send();
}
