import type { Request, Response } from 'express';
import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../config/prisma.js';
import type { CreateProjectInput, UpdateProjectInput } from '../schemas/project.schema.js';

const PATTERN_STEP_COUNT = 16;

interface TemplateStep {
  active: boolean;
  note: string | null;
  velocity: number;
}

// Cast explícito a InputJsonValue en cada función (no en cada call site):
// un array tipado con una interfaz nombrada (TemplateStep[]) no satisface
// estructuralmente el JSON de Prisma sin esto -- mismo motivo por el que
// track.service.ts hace lo mismo con instrumentConfig.
function toInputJson(steps: TemplateStep[]): Prisma.InputJsonValue {
  return steps as unknown as Prisma.InputJsonValue;
}

// Kick a cuatro tiempos: universal en house/disco, no depende de la key que
// elija el usuario (a diferencia de una línea de bajo con notas concretas).
function templateKickSteps(): Prisma.InputJsonValue {
  return toInputJson(
    Array.from({ length: PATTERN_STEP_COUNT }, (_, i) => ({
      active: i % 4 === 0,
      note: null,
      velocity: i % 4 === 0 ? 1 : 0,
    })),
  );
}

// Bajo simplificado, a propósito SIN notas explícitas (note: null en todos
// los steps activos): un proyecto nuevo puede tener cualquier key, así que
// copiar literal la línea melódica del seed de "Mi primera sesión" (notas
// fijas A1/C2/G1, pensadas para su "Am" concreta) sonaría desafinado en
// cualquier otra tonalidad. Un patrón rítmico puro -- activo en los
// contratiempos impares (steps 3,7,11,15 de 16, 1-indexados) -- suena bien
// en cualquier key porque usa la nota por defecto de BASS que resuelve el
// cliente (ver defaultNoteForTrackType), no una prefijada aquí.
function templateBassSteps(): Prisma.InputJsonValue {
  return toInputJson(
    Array.from({ length: PATTERN_STEP_COUNT }, (_, i) => {
      const active = i === 2 || i === 6 || i === 10 || i === 14;
      return { active, note: null, velocity: active ? 0.9 : 0 };
    }),
  );
}

// Hi-hat cerrado en las 16 corcheas -- igual criterio que el seed: rellena
// el pulso constante sin competir con Kick ni Bajo, y tampoco depende de key.
function templateHihatSteps(): Prisma.InputJsonValue {
  return toInputJson(
    Array.from({ length: PATTERN_STEP_COUNT }, () => ({
      active: true,
      note: null,
      velocity: 0.6,
    })),
  );
}

// Todo proyecto nuevo nace con 3 Tracks ya sonando (Kick/Bajo/Hi-hat, cada
// uno con su Pattern de fábrica) en la MISMA escritura (nested create de
// Prisma, mismo patrón que ya se usa para Track+Pattern en
// track.service.ts) -- para que alguien sin experiencia consiga algo
// audible con solo darle a Play, sin tener que entender qué es un "Track" o
// un "Pattern" antes de oír nada. Deliberadamente NO se incluyen Snare ni
// Hi-hat abierto: la plantilla se mantiene mínima (3 sonidos) para no
// abrumar -- el usuario puede añadir más Tracks él mismo si quiere.
export async function createProject(req: Request, res: Response): Promise<void> {
  const { name, bpm, key, swing } = req.body as CreateProjectInput;

  const project = await prisma.project.create({
    data: {
      userId: req.userId!,
      name,
      bpm,
      key,
      swing,
      tracks: {
        create: [
          {
            name: 'Kick',
            type: 'DRUM',
            order: 0,
            instrumentConfig: { synth: 'MembraneSynth', pitchDecay: 0.05, octaves: 6 },
            patterns: {
              create: {
                name: 'Patrón principal',
                steps: templateKickSteps(),
                timelinePosition: 0,
              },
            },
          },
          {
            name: 'Bajo',
            type: 'BASS',
            order: 1,
            instrumentConfig: {
              synth: 'MonoSynth',
              envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.8 },
            },
            patterns: {
              create: {
                name: 'Patrón principal',
                steps: templateBassSteps(),
                timelinePosition: 0,
              },
            },
          },
          {
            name: 'Hi-hat',
            type: 'HIHAT',
            order: 2,
            volume: 0.6,
            instrumentConfig: {
              synth: 'NoiseSynth',
              envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
            },
            patterns: {
              create: {
                name: 'Patrón principal',
                steps: templateHihatSteps(),
                timelinePosition: 0,
              },
            },
          },
        ],
      },
    },
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
