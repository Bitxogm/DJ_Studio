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

// Constantes que reflejan literalmente las clases Tailwind usadas más abajo
// (h-11 = 44px, p-1.5 = 6px, gap-1/gap-2 = 4px/8px, escala de 0.25rem=4px) --
// se usan para calcular la altura real del panel a partir del número de
// filas, en vez de un pixel hardcodeado que solo era correcto para 2 Tracks
// (el bug que motivó este cálculo: con un tercer Track, ese número se quedó
// corto y volvió el scroll).
const HEADER_HEIGHT_PX = 44; // h-11 de la barra de Play/colapsar
const CONTENT_VERTICAL_PADDING_PX = 16; // py-2 del wrapper de contenido (8px arriba + 8px abajo)
const CONTENT_GAP_PX = 8; // gap-2: entre StepNumbers y el bloque de filas, y entre cada fila
// StepNumbers: texto de 10px con leading-none, con un pequeño margen de
// seguridad frente a redondeos de line-height entre navegadores/fuentes.
const STEP_NUMBERS_HEIGHT_PX = 16;
// Alto de una fila de PatternGrid: padding (p-1.5 = 6px arriba y abajo) +
// línea del nombre del Track (text-xs, line-height 16px) + gap entre el
// nombre y los steps (space-y-1 = 4px) + alto de los steps (h-7, ver
// PatternGrid más abajo).
const ROW_STEP_HEIGHT_PX = 28; // h-7
const ROW_HEIGHT_PX = 6 * 2 + 16 + 4 + ROW_STEP_HEIGHT_PX;
// Altura mínima del área de contenido cuando no hay ningún grid que mostrar
// (mensaje centrado de "cargando"/"sin patrones").
const EMPTY_CONTENT_HEIGHT_PX = 96;
// A partir de este número de Tracks editables a la vez, el panel deja de
// crecer con cada fila nueva y empieza a hacer scroll -- evita que el
// secuenciador se coma toda la pantalla en un proyecto con muchos Tracks.
// Por debajo de este límite la altura es la suma real de las filas, nunca un
// valor fijo.
const MAX_VISIBLE_ROWS = 5;

// Altura total del panel expandido para `rowCount` Tracks editables. Crece
// con cada fila real hasta MAX_VISIBLE_ROWS; a partir de ahí se satura y el
// `overflow-y-auto` ya presente en el wrapper de contenido empieza a
// scrollear las filas que no quepan.
function computeExpandedPanelHeight(rowCount: number): number {
  if (rowCount === 0) {
    return HEADER_HEIGHT_PX + EMPTY_CONTENT_HEIGHT_PX;
  }
  const visibleRows = Math.min(rowCount, MAX_VISIBLE_ROWS);
  const rowsHeight = visibleRows * ROW_HEIGHT_PX + (visibleRows - 1) * CONTENT_GAP_PX;
  return (
    HEADER_HEIGHT_PX +
    CONTENT_VERTICAL_PADDING_PX +
    STEP_NUMBERS_HEIGHT_PX +
    CONTENT_GAP_PX +
    rowsHeight
  );
}

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
  const expandedHeightPx = computeExpandedPanelHeight(editableTracks.length);

  return (
    <div
      className="flex shrink-0 flex-col border-t border-border bg-card/40 transition-[height]"
      style={{ height: collapsed ? HEADER_HEIGHT_PX : expandedHeightPx }}
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
              // h-7 (no h-8): con 3+ Tracks editables, 32px por fila hacía
              // que el panel creciera más de lo necesario -- 28px sigue
              // siendo un objetivo de click cómodo y deja más filas visibles
              // sin scroll (ver ROW_STEP_HEIGHT_PX, que debe coincidir).
              'h-7 flex-1 rounded-sm border transition-colors',
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
