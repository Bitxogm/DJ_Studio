import fs from 'fs/promises';
import path from 'path';
import type { Request, Response } from 'express';
import * as sampleService from '../services/sample.service.js';
import { matchesAudioSignature } from '../utils/audioFileSignature.js';

export async function uploadSampleFile(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({
      error: 'Fichero de audio requerido (audio/wav, audio/mpeg, audio/mp3 o audio/ogg)',
    });
    return;
  }

  // Segunda capa además del mimetype declarado: comprueba los bytes reales del
  // fichero para que un .exe renombrado como "beat.mp3" no cuele.
  const isRealAudio = await matchesAudioSignature(req.file.path, req.file.mimetype);
  if (!isRealAudio) {
    await fs.unlink(req.file.path).catch(() => undefined);
    res.status(400).json({ error: 'El contenido del fichero no coincide con el tipo declarado' });
    return;
  }

  const sample = await sampleService.createSample({
    userId: req.userId!,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    storagePath: req.file.path,
  });

  res.status(201).json({ sample });
}

export async function listSamples(req: Request, res: Response): Promise<void> {
  const samples = await sampleService.listSamplesByUser(req.userId!);
  res.status(200).json({ samples });
}

export async function deleteSampleFile(req: Request, res: Response): Promise<void> {
  await sampleService.deleteSample(req.sample!.id, req.sample!.storagePath);
  res.status(204).send();
}

export function streamSampleFile(req: Request, res: Response): void {
  res.sendFile(path.resolve(req.sample!.storagePath));
}
