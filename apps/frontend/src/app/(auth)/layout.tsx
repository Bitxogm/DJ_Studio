'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/useAuth';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Sesión ya activa: /login y /register no tienen nada que hacer aquí.
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/studio');
    }
  }, [isLoading, user, router]);

  const showForm = !isLoading && !user;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(148,163,184,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.4)_1px,transparent_1px)] [background-size:3.5rem_3.5rem]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_50%_0%,rgba(34,211,238,0.16),transparent_70%)]"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-display text-3xl font-bold tracking-tight text-foreground">
            beat<span className="text-primary">forge</span>
          </span>
          <span className="text-sm text-muted-foreground">
            Estudio de producción musical en el navegador
          </span>
        </div>

        {showForm ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full"
          >
            {children}
          </motion.div>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="size-8 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
