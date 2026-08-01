import type { Request, Response } from 'express';
import type { CreateTrackInput, UpdateTrackInput } from '../schemas/track.schema.js';
import * as trackService from '../services/track.service.js';

export async function createTrack(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateTrackInput;
  const track = await trackService.createTrack(req.project!.id, input);
  res.status(201).json({ track });
}

export async function listTracks(req: Request, res: Response): Promise<void> {
  const tracks = await trackService.listTracksByProject(req.project!.id);
  res.status(200).json({ tracks });
}

export async function updateTrack(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateTrackInput;
  const track = await trackService.updateTrack(req.track!.id, input);
  res.status(200).json({ track });
}

export async function deleteTrack(req: Request, res: Response): Promise<void> {
  await trackService.deleteTrack(req.track!.id);
  res.status(204).send();
}
