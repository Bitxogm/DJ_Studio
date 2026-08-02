'use client';

import { useState } from 'react';
import type { Project } from '@beatforge/shared';
import { toast } from 'sonner';

import { ApiRequestError } from '@/lib/api/httpError';
import { updateProjectRequest } from '@/lib/api/projects';
import { cn } from '@/lib/utils';
import { useStudioStore } from '@/store/studio';

interface ProjectHeaderProps {
  project: Project;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const updateProjectLocal = useStudioStore((state) => state.updateProjectLocal);

  async function handleSave(patch: {
    name?: string;
    bpm?: number;
    key?: string | null;
    swing?: number;
  }) {
    try {
      const updated = await updateProjectRequest(project.id, patch);
      updateProjectLocal(updated);
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'No se pudo conectar con el servidor',
      );
    }
  }

  return (
    <div className="mb-6 space-y-2">
      <InlineEditableText
        value={project.name}
        onSave={(name) => {
          if (name.trim()) void handleSave({ name: name.trim() });
        }}
        className="font-display text-2xl font-bold tracking-tight text-foreground"
      />
      <div className="flex flex-wrap items-center gap-5 text-sm">
        <InlineEditableNumber
          label="BPM"
          value={project.bpm}
          min={1}
          max={999}
          step={1}
          onSave={(bpm) => void handleSave({ bpm })}
        />
        <InlineEditableText
          label="Key"
          value={project.key ?? ''}
          placeholder="Sin definir"
          onSave={(key) => void handleSave({ key: key.trim() || null })}
        />
        <InlineEditableNumber
          label="Swing"
          value={project.swing}
          min={0}
          max={1}
          step={0.05}
          onSave={(swing) => void handleSave({ swing })}
        />
      </div>
    </div>
  );
}

interface InlineEditableTextProps {
  value: string;
  onSave: (value: string) => void;
  label?: string;
  className?: string;
  placeholder?: string;
}

function InlineEditableText({
  value,
  onSave,
  label,
  className,
  placeholder,
}: InlineEditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    if (draft !== value) {
      onSave(draft);
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={cn(
          'rounded border border-primary/50 bg-background px-1.5 py-0.5 outline-none',
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={cn(
        'rounded px-1.5 py-0.5 text-left transition-colors hover:bg-secondary/60',
        !value && 'text-muted-foreground',
        className,
      )}
    >
      {label ? (
        <span className="mr-1.5 text-xs uppercase text-muted-foreground">{label}</span>
      ) : null}
      {value || placeholder || '—'}
    </button>
  );
}

interface InlineEditableNumberProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onSave: (value: number) => void;
}

function InlineEditableNumber({ label, value, min, max, step, onSave }: InlineEditableNumberProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  function commit() {
    setEditing(false);
    const parsed = Number(draft);
    if (!Number.isNaN(parsed) && parsed !== value) {
      onSave(Math.min(max, Math.max(min, parsed)));
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        className="w-20 rounded border border-primary/50 bg-background px-1.5 py-0.5 outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className="rounded px-1.5 py-0.5 transition-colors hover:bg-secondary/60"
    >
      <span className="mr-1.5 text-xs uppercase text-muted-foreground">{label}</span>
      {value}
    </button>
  );
}
