'use client';

import { cn } from '@/lib/utils';
import { useStudioStore } from '@/store/studio';
import { NewProjectDialog } from './NewProjectDialog';

export function ProjectSidebar() {
  const projects = useStudioStore((state) => state.projects);
  const selectedProjectId = useStudioStore((state) => state.selectedProjectId);
  const selectProject = useStudioStore((state) => state.selectProject);

  return (
    <aside className="flex w-[260px] shrink-0 flex-col gap-3 border-r border-border bg-card/40 p-3">
      <NewProjectDialog />

      <div className="flex-1 space-y-1 overflow-y-auto">
        {projects.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            Todavía no tienes proyectos.
          </p>
        ) : (
          projects.map((project) => {
            const isSelected = project.id === selectedProjectId;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => selectProject(project.id)}
                className={cn(
                  'w-full rounded-md border px-3 py-2 text-left text-sm transition-colors',
                  isSelected
                    ? 'border-primary/60 bg-primary/10 text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-secondary/60 hover:text-foreground',
                )}
              >
                <span className="block truncate font-medium">{project.name}</span>
                <span className="text-xs text-muted-foreground">{project.bpm} BPM</span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
