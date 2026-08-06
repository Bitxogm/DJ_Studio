import '../src/config/env.js';
import { config } from '../src/config/index.js';
import { prisma } from '../src/config/prisma.js';
import { hashPassword } from '../src/services/auth.service.js';

// SOLO DESARROLLO, NUNCA PRODUCCIÓN. Mismas credenciales documentadas en
// CLAUDE.md > Frontend > Quick login (dev) y en
// apps/frontend/src/lib/dev/demoUsers.ts (los botones de quick login del
// frontend). Si cambias algo aquí, actualiza también esos dos sitios.
const DEMO_USERS_SEED = [
  { email: 'dev1@beatforge.local', password: 'Demo1234!', displayName: 'Demo Uno' },
  { email: 'dev2@beatforge.local', password: 'Demo1234!', displayName: 'Demo Dos' },
] as const;

interface PatternStepSeed {
  active: boolean;
  note: string | null;
  velocity: number;
}

// Kick a cuatro tiempos (house/disco): steps 0, 4, 8, 12 de 16.
function fourOnTheFloorSteps(): PatternStepSeed[] {
  return Array.from({ length: 16 }, (_, i) => ({
    active: i % 4 === 0,
    note: null,
    velocity: i % 4 === 0 ? 1 : 0,
  }));
}

function simpleBassSteps(): PatternStepSeed[] {
  const notes: (string | null)[] = [
    'A1',
    null,
    null,
    'A1',
    null,
    'C2',
    null,
    null,
    'A1',
    null,
    null,
    'A1',
    null,
    'G1',
    null,
    null,
  ];
  return notes.map((note) => ({ active: note !== null, note, velocity: note !== null ? 0.9 : 0 }));
}

// Hi-hat cerrado en TODAS las corcheas (16/16), no solo en los contratiempos:
// es el patrón más reconocible de four-on-the-floor house/disco, y al ser
// denso no compite rítmicamente con el Kick (0,4,8,12) ni con la síncopa del
// Bajo -- simplemente rellena el pulso constante por debajo de ambos.
// Velocity 0.6 (no 1): un hi-hat a máxima velocity suena más fuerte que el
// propio Kick, que es quien debe llevar el peso ritmico.
function constantHihatSteps(): PatternStepSeed[] {
  return Array.from({ length: 16 }, () => ({ active: true, note: null, velocity: 0.6 }));
}

// Backbeat clásico: activo en los tiempos 2 y 4 del compás (índices 4 y 12
// de 16, 0-indexados -- steps 5 y 13 en la numeración 1-16 de la UI). El
// Kick (fourOnTheFloorSteps) YA suena en esos mismos índices porque es
// four-on-the-floor (los 4 tiempos): es el layout correcto de house/disco,
// kick en los 4 tiempos y snare/clap acentuando el 2 y 4 encima, no un hueco
// vacío.
function backbeatSnareSteps(): PatternStepSeed[] {
  return Array.from({ length: 16 }, (_, i) => {
    const active = i === 4 || i === 12;
    return { active, note: null, velocity: active ? 0.8 : 0 };
  });
}

async function main(): Promise<void> {
  if (config.nodeEnv === 'production') {
    throw new Error(
      'El seed de desarrollo no puede ejecutarse con NODE_ENV=production. Abortando.',
    );
  }

  const emails = DEMO_USERS_SEED.map((u) => u.email);

  // Idempotente: borra y recrea solo estos dos usuarios concretos, nunca toca
  // el resto de la BD. onDelete: Cascade (User -> Project -> Track -> Pattern,
  // User -> Session) limpia todo lo asociado antes de recrearlo desde cero.
  await prisma.user.deleteMany({ where: { email: { in: emails } } });

  const [demo1, demo2] = DEMO_USERS_SEED;
  const [passwordHash1, passwordHash2] = await Promise.all([
    hashPassword(demo1.password),
    hashPassword(demo2.password),
  ]);

  await prisma.user.create({
    data: {
      email: demo1.email,
      passwordHash: passwordHash1,
      displayName: demo1.displayName,
      projects: {
        create: {
          name: 'Mi primera sesión',
          bpm: 124,
          key: 'Am',
          tracks: {
            create: [
              {
                name: 'Kick',
                type: 'DRUM',
                order: 0,
                instrumentConfig: { synth: 'MembraneSynth', pitchDecay: 0.05, octaves: 6 },
                patterns: {
                  create: {
                    name: 'Loop principal',
                    steps: fourOnTheFloorSteps(),
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
                    name: 'Línea de bajo',
                    steps: simpleBassSteps(),
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
                    name: 'Corcheas',
                    steps: constantHihatSteps(),
                    timelinePosition: 0,
                  },
                },
              },
              {
                name: 'Snare',
                type: 'SNARE',
                order: 3,
                instrumentConfig: {
                  synth: 'NoiseSynth',
                  noise: { type: 'pink' },
                  envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
                },
                patterns: {
                  create: {
                    name: 'Backbeat',
                    steps: backbeatSnareSteps(),
                    timelinePosition: 0,
                  },
                },
              },
            ],
          },
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      email: demo2.email,
      passwordHash: passwordHash2,
      displayName: demo2.displayName,
    },
  });

  console.log('Seed de desarrollo aplicado:');
  console.log(`  - ${demo1.email} — con proyecto de ejemplo (4 tracks, 4 patterns)`);
  console.log(`  - ${demo2.email} — sin proyectos (usuario recién registrado)`);
}

main()
  .catch((error: unknown) => {
    console.error('Error ejecutando el seed de desarrollo:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
