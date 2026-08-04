'use client';

import { useEffect, useState } from 'react';
import type { Track } from '@beatforge/shared';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ApiRequestError } from '@/lib/api/httpError';
import { updateTrackRequest } from '@/lib/api/tracks';
import { TRACK_TYPE_COLORS } from '@/lib/trackTypeColors';
import { cn } from '@/lib/utils';
import { useStudioStore } from '@/store/studio';

interface TrackRowProps {
  track: Track;
  projectId: string;
}

export function TrackRow({ track, projectId }: TrackRowProps) {
  const updateTrackLocal = useStudioStore((state) => state.updateTrackLocal);
  const [volume, setVolume] = useState(track.volume);
  const [pendingToggle, setPendingToggle] = useState<'mute' | 'solo' | null>(null);

  useEffect(() => {
    setVolume(track.volume);
  }, [track.volume]);

  async function persist(
    patch: Partial<{ volume: number; muted: boolean; soloed: boolean }>,
    toggleKind?: 'mute' | 'solo',
  ) {
    if (toggleKind) setPendingToggle(toggleKind);
    try {
      const updated = await updateTrackRequest(projectId, track.id, patch);
      updateTrackLocal(updated);
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'No se pudo conectar con el servidor',
      );
    } finally {
      if (toggleKind) setPendingToggle(null);
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card/50 px-4 py-3">
      <div className="flex w-40 shrink-0 flex-col gap-1.5">
        <span className="truncate text-sm font-medium text-foreground">{track.name}</span>
        <Badge variant="outline" className={cn('w-fit', TRACK_TYPE_COLORS[track.type].badge)}>
          {track.type}
        </Badge>
      </div>

      <div className="flex flex-1 items-center gap-3">
        <span className="w-9 shrink-0 text-right text-xs text-muted-foreground">
          {Math.round(volume * 100)}
        </span>
        <Slider
          value={[volume]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={([next]) => setVolume(next)}
          onValueCommit={([next]) => void persist({ volume: next })}
          className="max-w-xs"
          aria-label={`Volumen de ${track.name}`}
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={track.muted ? 'destructive' : 'outline'}
          disabled={pendingToggle !== null}
          onClick={() => void persist({ muted: !track.muted }, 'mute')}
        >
          Mute
        </Button>
        <Button
          type="button"
          size="sm"
          variant={track.soloed ? 'default' : 'outline'}
          disabled={pendingToggle !== null}
          onClick={() => void persist({ soloed: !track.soloed }, 'solo')}
        >
          Solo
        </Button>
      </div>
    </div>
  );
}
