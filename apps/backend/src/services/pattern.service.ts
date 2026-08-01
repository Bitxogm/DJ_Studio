import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../config/prisma.js';
import type { CreatePatternInput, UpdatePatternInput } from '../schemas/pattern.schema.js';

export function createPattern(trackId: string, input: CreatePatternInput) {
  const data: Prisma.PatternUncheckedCreateInput = {
    trackId,
    name: input.name,
    steps: input.steps,
    timelinePosition: input.timelinePosition,
    lengthInBars: input.lengthInBars,
  };

  return prisma.pattern.create({ data });
}

export function listPatternsByTrack(trackId: string) {
  return prisma.pattern.findMany({ where: { trackId }, orderBy: { timelinePosition: 'asc' } });
}

export function updatePattern(patternId: string, input: UpdatePatternInput) {
  const data: Prisma.PatternUncheckedUpdateInput = {
    ...input,
  };

  return prisma.pattern.update({ where: { id: patternId }, data });
}

export function deletePattern(patternId: string) {
  return prisma.pattern.delete({ where: { id: patternId } });
}
