'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Play, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSequencer } from '@/hooks/useSequencer';
import { findDrumTrack, getPlayDisabledReason } from '@/lib/sequencer/logic';
import { cn } from '@/lib/utils';
import { useStudioStore } from '@/store/studio';

interface SequencerPanelProps {
  bpm: number;
}

// Alcance de este prompt: solo el primer Track DRUM del proyecto suena
// (kick sintetizado con Tone.MembraneSynth). El resto de tracks, la edición
// de steps por click y los efectos llegan en prompts siguientes.
export function SequencerPanel({ bpm }: SequencerPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const tracks = useStudioStore((state) => state.tracks);
  const drumPattern = useStudioStore((state) => state.drumPattern);
  const isLoadingPattern = useStudioStore((state) => state.isLoadingPattern);
  const drumTrack = findDrumTrack(tracks);

  const { isPlaying, currentStep, canPlay, play, stop } = useSequencer({
    bpm,
    pattern: drumPattern,
  });

  const disabledReason = getPlayDisabledReason({
    drumTrack,
    hasPattern: drumPattern !== null,
    isLoadingPattern,
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
            disabled={!canPlay}
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
              <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
                {drumPattern.steps.map((step, index) => (
                  <div
                    key={index}
                    className={cn(
                      'aspect-square rounded-sm border transition-colors',
                      step.active
                        ? 'border-primary/50 bg-primary/30'
                        : 'border-border/60 bg-muted/30',
                      currentStep === index && 'ring-2 ring-emerald-400',
                    )}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {isLoadingPattern
                ? 'Cargando patrón...'
                : (disabledReason ?? 'Sin patrón que mostrar.')}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
