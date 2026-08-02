'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Music2, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/useAuth';
import { AuthApiError } from '@/lib/api/auth';
import { DEV_ONLY_DEMO_USERS, type DemoUser } from '@/lib/dev/demoUsers';

const DEMO_ICONS = [Music2, UserRound];

export function QuickLoginButtons() {
  const router = useRouter();
  const { login } = useAuth();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  // Defensa adicional: aunque QuickLoginSection (Server Component) ya evita
  // renderizar este componente en producción, este chequeo hace que el propio
  // minificador de Next.js elimine el resto del cuerpo -- incluidas las
  // credenciales de DEV_ONLY_DEMO_USERS -- del bundle en un build real.
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  async function handleQuickLogin(user: DemoUser) {
    setLoadingEmail(user.email);
    try {
      await login({ email: user.email, password: user.password });
      toast.success(`Sesión iniciada como ${user.displayName}`);
      router.push('/studio');
    } catch (error) {
      toast.error(
        error instanceof AuthApiError ? error.message : 'No se pudo conectar con el servidor',
      );
      setLoadingEmail(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {DEV_ONLY_DEMO_USERS.map((user, index) => {
        const Icon = DEMO_ICONS[index] ?? UserRound;
        const isLoading = loadingEmail === user.email;
        return (
          <Button
            key={user.email}
            type="button"
            variant="outline"
            className="h-auto flex-col items-start gap-1 py-3 text-left"
            disabled={loadingEmail !== null}
            onClick={() => void handleQuickLogin(user)}
          >
            <span className="flex w-full items-center gap-2 text-sm font-medium">
              <Icon className="size-4 text-primary" aria-hidden />
              {user.displayName}
              {isLoading ? <Spinner className="ml-auto size-3.5" /> : null}
            </span>
            <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
          </Button>
        );
      })}
    </div>
  );
}
