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
  console.log(`  - ${demo1.email} — con proyecto de ejemplo (2 tracks, 2 patterns)`);
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
