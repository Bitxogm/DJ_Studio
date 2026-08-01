import fs from 'fs/promises';
import { prisma } from '../config/prisma.js';

interface CreateSampleInput {
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
}

export function createSample(input: CreateSampleInput) {
  return prisma.sample.create({
    data: {
      userId: input.userId,
      filename: input.filename,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storagePath: input.storagePath,
      // TODO: calcular la duración real cuando se integre un parser de audio.
      durationSeconds: null,
    },
  });
}

export function listSamplesByUser(userId: string) {
  return prisma.sample.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function deleteSample(sampleId: string, storagePath: string): Promise<void> {
  // Track.sampleId ya tiene onDelete: SetNull en el schema (Track -> Sample): cualquier
  // Track que usara este Sample simplemente se queda sin sampleId al borrarlo. No hace
  // falta comprobar referencias antes de borrar, la propia BD lo resuelve de forma segura.
  await prisma.sample.delete({ where: { id: sampleId } });

  // El registro en BD ya se borró (fuente de verdad para el usuario); si el fichero
  // físico ya no estuviera por algún motivo, no lo tratamos como error fatal.
  await fs.unlink(storagePath).catch(() => undefined);
}
