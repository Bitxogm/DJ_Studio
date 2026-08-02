import { Separator } from '@/components/ui/separator';
import { QuickLoginButtons } from './QuickLoginButtons';

// Server Component (sin 'use client'): este chequeo corre en el servidor
// durante el render de cada petición. Si es falso, <QuickLoginButtons />
// nunca entra en el árbol RSC de esa petición -- ni el HTML servido ni el
// payload React enviado al navegador lo referencian. Ver CLAUDE.md >
// Frontend > Quick login (dev) para el detalle de por qué esto es distinto
// (y más robusto) que ocultarlo con CSS o con una condición en cliente.
export function QuickLoginSection() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="mt-6 w-full space-y-4">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          Accesos rápidos (solo desarrollo)
        </span>
        <Separator className="flex-1" />
      </div>
      <QuickLoginButtons />
    </div>
  );
}
