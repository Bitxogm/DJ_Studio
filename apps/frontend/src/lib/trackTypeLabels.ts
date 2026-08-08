import type { TrackType } from '@beatforge/shared';

// Nombre real del sonido en español, para mostrar como subtítulo discreto
// junto al TrackType técnico (DRUM/BASS/...) en TrackRow y en el grid del
// secuenciador -- alguien sin experiencia musical no debería tener que saber
// qué es un "HIHAT_OPEN" para reconocer su Track. Mismos nombres que usa
// prisma/seed.ts para sus Tracks de ejemplo, centralizados aquí en vez de
// duplicar los strings sueltos en cada componente.
export const TRACK_TYPE_LABELS: Record<TrackType, string> = {
  DRUM: 'Kick',
  BASS: 'Bajo',
  SYNTH: 'Synth',
  SAMPLE: 'Sample',
  HIHAT: 'Hi-hat',
  SNARE: 'Snare',
  HIHAT_OPEN: 'Hi-hat abierto',
};
