import type { Request, Response } from 'express';
import type { CreatePatternInput, UpdatePatternInput } from '../schemas/pattern.schema.js';
import * as patternService from '../services/pattern.service.js';

export async function createPattern(req: Request, res: Response): Promise<void> {
  const input = req.body as CreatePatternInput;
  const pattern = await patternService.createPattern(req.track!.id, input);
  res.status(201).json({ pattern });
}

export async function listPatterns(req: Request, res: Response): Promise<void> {
  const patterns = await patternService.listPatternsByTrack(req.track!.id);
  res.status(200).json({ patterns });
}

export async function updatePattern(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdatePatternInput;
  const pattern = await patternService.updatePattern(req.pattern!.id, input);
  res.status(200).json({ pattern });
}

export async function deletePattern(req: Request, res: Response): Promise<void> {
  await patternService.deletePattern(req.pattern!.id);
  res.status(204).send();
}
