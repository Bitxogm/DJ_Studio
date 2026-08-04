'use client';

import { useState } from 'react';
import type { Pattern, Track } from '@beatforge/shared';
import { ChevronDown, ChevronUp, Play, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePatternEditor } from '@/hooks/usePatternEditor';
import { useSequencer } from '@/hooks/useSequencer';
import { findDrumTrack, getPlayDisabledReason } from '@/lib/sequencer/logic';
import { TRACK_TYPE_COLORS } from '@/lib/trackTypeColors';
import { cn } from '@/lib/utils';
import { useStudioStore } from '@/store/studio';

interface SequencerPanelProps {
  bpm: number;
}

const STEP_COUNT = 16;

// El motor de audio (useSequencer) reproduce TODOS los Tracks del proyecto
// que tengan un Pattern asociado. El grid interactivo hace lo mismo -- uno
// por cada Track con Pattern, apilados verticalmente (Kick, Bajo, y
// cualquier otro que llegue en el futuro), en vez de estar atado a un único
// Track hardcodeado. El botón Play sigue dependiendo solo de que exista un
// Track DRUM (ver getPlayDisabledReason) -- esa regla no cambia aquí.
export function SequencerPanel({ bpm }: SequencerPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const tracks = useStudioStore((state) => state.tracks);
  const trackPatterns = useStudioStore((state) => state.trackPatterns);
  const isLoadingPatterns = useStudioStore((state) => state.isLoadingPatterns);
  const setTrackPattern = useStudioStore((state) => state.setTrackPattern);
  const drumTrack = findDrumTrack(tracks);
  const drumPattern = drumTrack ? (trackPatterns[drumTrack.id] ?? null) : null;

  const { isPlaying, currentStep, play, stop } = useSequencer({
    bpm,
    tracks,
    patternsByTrackId: trackPatterns,
  });

  const { toggleStep } = usePatternEditor({
    patternsByTrackId: trackPatterns,
    onChange: setTrackPattern,
  });

  // El botón Play sigue centrado en el Track DRUM (aunque el grid ya
  // muestre/edite varios), no en el `canPlay` genérico de useSequencer -- si
  // se usara ese valor aquí, un proyecto con Bajo pero sin batería
  // habilitaría el botón mientras el mensaje seguiría pidiendo "añade un
  // Track de batería", una contradicción visible para el usuario.
  const disabledReason = getPlayDisabledReason({
    drumTrack,
    hasPattern: drumPattern !== null,
    isLoadingPattern: isLoadingPatterns,
  });

  const editableTracks = tracks.filter((track) => trackPatterns[track.id]);

  return (
    <div
      className={cn(
        'flex shrink-0 flex-col border-t border-border bg-card/40 transition-[height]',
        collapsed ? 'h-11' : 'h-[240px]',
      )}
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (isPlaying ? stop() : void play())}
            disabled={!!disabledReason}
            title={disabledReason ?? undefined}
            aria-label={isPlaying ? 'Detener secuenciador' : 'Reproducir secuenciador'}
            className={cn(
              'flex size-9 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
              isPlaying
                ? 'animate-pulse border-emerald-500/60 bg-emerald-500/20 text-emerald-400'
                : 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20',
            )}
          >
            {isPlaying ? (
              <Square className="size-4 fill-current" aria-hidden />
            ) : (
              <Play className="size-4 fill-current" aria-hidden />
            )}
          </button>
          <span className="text-sm font-medium text-muted-foreground">Secuenciador</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((current) => !current)}
          aria-label={collapsed ? 'Expandir secuenciador' : 'Colapsar secuenciador'}
        >
          {collapsed ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </div>

      {!collapsed ? (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-2">
          {editableTracks.length > 0 ? (
            <>
              {/* Numeración compartida (1-16, no 0-15): una sola fila arriba
                  de todos los grids en vez de repetirla por Track -- ahorra
                  alto (clave para que quepan sin scroll) y garantiza que
                  Kick y Bajo lean exactamente la misma columna, porque es
                  literalmente la misma fila la que alinea a ambos. */}
              <StepNumbers />
              <div className="flex flex-1 flex-col justify-center gap-2">
                {editableTracks.map((track) => (
                  <PatternGrid
                    key={track.id}
                    track={track}
                    pattern={trackPatterns[track.id]}
                    currentStep={currentStep}
                    onToggleStep={(stepIndex) => toggleStep(track.id, stepIndex)}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
              {isLoadingPatterns
                ? 'Cargando patrones...'
                : (disabledReason ?? 'Sin patrones que mostrar.')}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

// Mismo esqueleto (flex/gap-1/ml-1.5 cada 4) que las filas de steps de
// PatternGrid, a propósito: al ser la misma estructura, la columna N de esta
// fila cae exactamente sobre la columna N de cualquier grid de abajo, sin
// necesidad de calcular anchos a mano.
function StepNumbers() {
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: STEP_COUNT }, (_, index) => (
        <span
          key={index}
          className={cn(
            'flex-1 text-center text-[10px] leading-none text-muted-foreground/40',
            index % 4 === 0 && index !== 0 && 'ml-1.5',
          )}
        >
          {index + 1}
        </span>
      ))}
    </div>
  );
}

interface PatternGridProps {
  track: Track;
  pattern: Pattern;
  currentStep: number;
  onToggleStep: (stepIndex: number) => void;
}

function PatternGrid({ track, pattern, currentStep, onToggleStep }: PatternGridProps) {
  const colors = TRACK_TYPE_COLORS[track.type];

  return (
    <div className={cn('space-y-1 rounded-md p-1.5', colors.rowTint)}>
      <span className="text-xs text-muted-foreground">{track.name}</span>
      <div className="flex gap-1">
        {pattern.steps.map((step, index) => (
          <button
            key={index}
            type="button"
            data-testid={`step-${track.id}-${index}`}
            onClick={() => onToggleStep(index)}
            aria-pressed={step.active}
            aria-label={`${track.name}, step ${index + 1}, ${step.active ? 'activo' : 'inactivo'}`}
            className={cn(
              // Altura FIJA (no aspect-square): con 16 columnas de ancho
              // flexible, un cuadrado real crecería de alto en pantallas
              // anchas y volvería a provocar scroll -- separar alto de ancho
              // es lo que hace que "sin scroll" se cumpla en cualquier
              // tamaño de ventana, no solo con la altura de panel de hoy.
              'h-8 flex-1 rounded-sm border transition-colors',
              index % 4 === 0 && index !== 0 && 'ml-1.5',
              step.active ? colors.stepActive : 'border-border/60 bg-muted/30 hover:bg-muted/60',
              currentStep === index && 'ring-2 ring-emerald-400',
            )}
          />
        ))}
      </div>
    </div>
  );
}
