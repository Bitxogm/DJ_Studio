'use client';

import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface StudioHeaderProps {
  displayName: string;
  onLogout: () => void;
}

export function StudioHeader({ displayName, onLogout }: StudioHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/60 px-4">
      <span className="font-display text-lg font-bold tracking-tight text-foreground">
        beat<span className="text-primary">forge</span>
      </span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          Hola, <span className="text-foreground">{displayName}</span>
        </span>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          <LogOut className="size-4" />
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
