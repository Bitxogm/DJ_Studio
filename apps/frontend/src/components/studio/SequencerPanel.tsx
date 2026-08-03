'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Play, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePatternEditor } from '@/hooks/usePatternEditor';
import { useSequencer } from '@/hooks/useSequencer';
import { findDrumTrack, getPlayDisabledReason } from '@/lib/sequencer/logic';
import { cn } from '@/lib/utils';
import { useStudioStore } from '@/store/studio';

interface SequencerPanelProps {
  bpm: number;
}

// El motor de audio (useSequencer) reproduce TODOS los Tracks del proyecto
// que tengan un Pattern asociado (hoy, en la práctica, Kick y Bajo). El grid
// interactivo sigue centrado en el Track DRUM únicamente -- editar los steps
// de otros tipos de Track es trabajo de un prompt futuro.
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
    trackId: drumTrack?.id ?? null,
    pattern: drumPattern,
    onChange: (pattern) => {
      if (drumTrack) setTrackPattern(drumTrack.id, pattern);
    },
  });

  // El botón Play sigue centrado en el Track DRUM (es lo único que el grid
  // muestra/controla), no en el `canPlay` genérico de useSequencer -- si se
  // usara ese valor aquí, un proyecto con Bajo pero sin batería habilitaría
  // el botón mientras el mensaje/grid seguirían hablando de "añade un Track
  // de batería", una contradicción visible para el usuario.
  const disabledReason = getPlayDisabledReason({
    drumTrack,
    hasPattern: drumPattern !== null,
    isLoadingPattern: isLoadingPatterns,
  });

  return (
    <div
      className={cn(
        'flex shrink-0 flex-col border-t border-border bg-card/40 transition-[height]',
        collapsed ? 'h-11' : 'h-[200px]',
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
        <div className="flex flex-1 flex-col justify-center gap-2 overflow-hidden px-4 py-3">
          {drumTrack && drumPattern ? (
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">{drumTrack.name}</span>
              <div className="flex gap-1">
                {drumPattern.steps.map((step, index) => (
                  <button
                    key={index}
                    type="button"
                    data-testid={`step-${index}`}
                    onClick={() => toggleStep(index)}
                    aria-pressed={step.active}
                    aria-label={`Step ${index + 1}, ${step.active ? 'activo' : 'inactivo'}`}
                    className={cn(
                      'aspect-square flex-1 rounded-sm border transition-colors',
                      // Separación sutil cada 4 steps (los "tiempos" del compás):
                      // se lee un patrón de un vistazo igual que en un step
                      // sequencer real.
                      index % 4 === 0 && index !== 0 && 'ml-1.5',
                      step.active
                        ? 'border-primary/60 bg-primary/40 hover:bg-primary/50'
                        : 'border-border/60 bg-muted/30 hover:bg-muted/60',
                      currentStep === index && 'ring-2 ring-emerald-400',
                    )}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {isLoadingPatterns
                ? 'Cargando patrón...'
                : (disabledReason ?? 'Sin patrón que mostrar.')}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
