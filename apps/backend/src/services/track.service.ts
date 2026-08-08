import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../config/prisma.js';
import type { CreateTrackInput, UpdateTrackInput } from '../schemas/track.schema.js';

const PATTERN_STEP_COUNT = 16;

// Steps "en blanco" de un Pattern recién creado: active:false/note:null/
// velocity:0 en las 16 posiciones, igual que cualquier step inactivo en el
// resto de la app (el seed usa exactamente esta forma para sus huecos). No
// depende del TrackType -- defaultNoteForTrackType solo se consulta al
// DISPARAR un step activo (ver src/lib/sequencer/logic.ts en el frontend),
// nunca se guarda en BD.
function emptyPatternSteps(): Prisma.InputJsonValue {
  return Array.from({ length: PATTERN_STEP_COUNT }, () => ({
    active: false,
    note: null,
    velocity: 0,
  }));
}

// Un Track nace SIEMPRE con un Pattern editable ya creado -- nested write en
// la misma escritura, para que no exista ninguna ventana en la que el Track
// ya exista pero su Pattern todavía no. Antes de este fix, un Track recién
// creado desde la UI ("+ Añadir track") se quedaba sin ningún Pattern y el
// secuenciador no ofrecía ninguna forma de crear uno -- el usuario quedaba
// bloqueado. Esto no contradice que Pattern sea una entidad separada de
// Track (pensada para admitir varios Patterns por Track en una futura
// timeline de arreglo, ver el comentario del modelo Pattern en
// schema.prisma): solo se crea el primero, en timelinePosition 0.
export function createTrack(projectId: string, input: CreateTrackInput) {
  const data: Prisma.TrackUncheckedCreateInput = {
    projectId,
    name: input.name,
    type: input.type,
    order: input.order,
    volume: input.volume,
    instrumentConfig: input.instrumentConfig as Prisma.InputJsonValue,
    sampleId: input.sampleId,
    patterns: {
      create: {
        name: 'Patrón principal',
        steps: emptyPatternSteps(),
        timelinePosition: 0,
      },
    },
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
