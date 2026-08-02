'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DECORATIVE_ROWS = 4;
const STEPS = 16;

// Puramente visual/estático por ahora: reserva el espacio para el step
// sequencer real que llegará con la integración de Tone.js.
export function SequencerPlaceholder() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        'flex shrink-0 flex-col border-t border-border bg-card/40 transition-[height]',
        collapsed ? 'h-11' : 'h-[200px]',
      )}
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 px-4">
        <span className="text-sm font-medium text-muted-foreground">
          Secuenciador <span className="text-xs text-muted-foreground/70">(próximamente)</span>
        </span>
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
        <div className="flex flex-1 flex-col justify-center gap-1.5 overflow-hidden px-4 py-3">
          {Array.from({ length: DECORATIVE_ROWS }).map((_, row) => (
            <div key={row} className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
              {Array.from({ length: STEPS }).map((_, step) => (
                <div
                  key={step}
                  className={cn(
                    'aspect-square rounded-sm border border-border/60',
                    step % 4 === 0 ? 'bg-secondary' : 'bg-muted/40',
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
