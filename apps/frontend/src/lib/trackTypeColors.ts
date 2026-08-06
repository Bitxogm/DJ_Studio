import type { TrackType } from '@beatforge/shared';

// Paleta por TrackType, en un solo sitio para que el badge del mixer
// (TrackRow) y el grid del secuenciador (SequencerPanel) usen exactamente el
// mismo color por tipo -- evita que ambos definan su propio mapeo suelto y
// acaben desincronizados si alguien cambia uno sin el otro.
interface TrackTypeColor {
  /** Badge de TrackRow (mixer). */
  badge: string;
  /** Step activo en el grid del secuenciador, con su propio hover. */
  stepActive: string;
  /** Tinte de fondo muy sutil para la fila entera del grid de ese Track. */
  rowTint: string;
}

export const TRACK_TYPE_COLORS: Record<TrackType, TrackTypeColor> = {
  DRUM: {
    badge: 'border-amber-500/30 bg-amber-500/15 text-amber-400',
    stepActive: 'border-amber-500/60 bg-amber-500/40 hover:bg-amber-500/50',
    rowTint: 'bg-amber-500/[0.06]',
  },
  BASS: {
    badge: 'border-rose-500/30 bg-rose-500/15 text-rose-400',
    stepActive: 'border-rose-500/60 bg-rose-500/40 hover:bg-rose-500/50',
    rowTint: 'bg-rose-500/[0.06]',
  },
  SYNTH: {
    badge: 'border-violet-500/30 bg-violet-500/15 text-violet-400',
    stepActive: 'border-violet-500/60 bg-violet-500/40 hover:bg-violet-500/50',
    rowTint: 'bg-violet-500/[0.06]',
  },
  SAMPLE: {
    badge: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
    stepActive: 'border-emerald-500/60 bg-emerald-500/40 hover:bg-emerald-500/50',
    rowTint: 'bg-emerald-500/[0.06]',
  },
  HIHAT: {
    badge: 'border-sky-500/30 bg-sky-500/15 text-sky-400',
    stepActive: 'border-sky-500/60 bg-sky-500/40 hover:bg-sky-500/50',
    rowTint: 'bg-sky-500/[0.06]',
  },
};
