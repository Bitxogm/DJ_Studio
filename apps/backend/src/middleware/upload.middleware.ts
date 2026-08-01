import { randomUUID } from 'crypto';
import fs from 'fs';
import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config/index.js';

export const ALLOWED_SAMPLE_MIME_TYPES = [
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
] as const;
export type AllowedSampleMimeType = (typeof ALLOWED_SAMPLE_MIME_TYPES)[number];

export const EXTENSION_BY_MIME: Record<AllowedSampleMimeType, string> = {
  'audio/wav': '.wav',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/ogg': '.ogg',
};

fs.mkdirSync(config.upload.dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (_req, file, cb) => {
    // Nombre generado (UUID + extensión derivada del mimetype), nunca el
    // nombre original: evita colisiones entre usuarios y cualquier intento
    // de inyectar caracteres/rutas a través del nombre que sube el cliente.
    const extension = EXTENSION_BY_MIME[file.mimetype as AllowedSampleMimeType] ?? '';
    cb(null, `${randomUUID()}${extension}`);
  },
});

export const uploadSample = multer({
  storage,
  // multer aplica el límite de bytes mientras recibe el stream: si se supera,
  // aborta y borra el fichero parcial antes de terminar de escribirlo a disco.
  limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isAllowed = (ALLOWED_SAMPLE_MIME_TYPES as readonly string[]).includes(file.mimetype);
    cb(null, isAllowed);
  },
});

export function handleUploadErrors(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: `El fichero supera el tamaño máximo permitido (${config.upload.maxFileSizeMb}MB)`,
    });
    return;
  }
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: 'Error al subir el fichero' });
    return;
  }
  next(err);
}
