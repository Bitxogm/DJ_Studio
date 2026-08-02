'use client';

import { motion } from 'framer-motion';

import { Skeleton } from '@/components/ui/skeleton';
import { useStudioStore } from '@/store/studio';
import { NewTrackDialog } from './NewTrackDialog';
import { TrackRow } from './TrackRow';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

interface TrackListProps {
  projectId: string;
}

export function TrackList({ projectId }: TrackListProps) {
  const tracks = useStudioStore((state) => state.tracks);
  const isLoadingTracks = useStudioStore((state) => state.isLoadingTracks);

  if (isLoadingTracks) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[68px] w-full" />
        <Skeleton className="h-[68px] w-full" />
        <Skeleton className="h-[68px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tracks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Este proyecto todavía no tiene tracks.
        </p>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {tracks.map((track) => (
            <motion.div key={track.id} variants={item}>
              <TrackRow track={track} projectId={projectId} />
            </motion.div>
          ))}
        </motion.div>
      )}
      <NewTrackDialog projectId={projectId} />
    </div>
  );
}
