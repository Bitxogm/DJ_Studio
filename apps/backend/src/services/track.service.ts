import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../config/prisma.js';
import type { CreateTrackInput, UpdateTrackInput } from '../schemas/track.schema.js';

export function createTrack(projectId: string, input: CreateTrackInput) {
  const data: Prisma.TrackUncheckedCreateInput = {
    projectId,
    name: input.name,
    type: input.type,
    order: input.order,
    volume: input.volume,
    instrumentConfig: input.instrumentConfig as Prisma.InputJsonValue,
    sampleId: input.sampleId,
  };

  return prisma.track.create({ data });
}

export function listTracksByProject(projectId: string) {
  return prisma.track.findMany({ where: { projectId }, orderBy: { order: 'asc' } });
}

export function updateTrack(trackId: string, input: UpdateTrackInput) {
  const data: Prisma.TrackUncheckedUpdateInput = {
    ...input,
    instrumentConfig: input.instrumentConfig as Prisma.InputJsonValue | undefined,
  };

  return prisma.track.update({ where: { id: trackId }, data });
}

export function deleteTrack(trackId: string) {
  return prisma.track.delete({ where: { id: trackId } });
}
