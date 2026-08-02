// SOLO DESARROLLO, NUNCA PRODUCCIÓN.
//
// Credenciales de los dos usuarios sembrados por apps/backend/prisma/seed.ts
// (ver también CLAUDE.md > Frontend > Quick login). Viven aquí como
// constante de código -- NUNCA en variables de entorno -- precisamente para
// que no exista ni la posibilidad de configurarlas por error en producción.
//
// El único importador de este módulo es
// src/components/auth/QuickLoginButtons.tsx, que a su vez solo se renderiza
// cuando NODE_ENV === 'development' (gate en el Server Component
// src/components/auth/QuickLoginSection.tsx). No importar este fichero desde
// ningún otro sitio.
export interface DemoUser {
  email: string;
  password: string;
  displayName: string;
}

export const DEV_ONLY_DEMO_USERS: DemoUser[] = [
  { email: 'dev1@beatforge.local', password: 'Demo1234!', displayName: 'Demo Uno' },
  { email: 'dev2@beatforge.local', password: 'Demo1234!', displayName: 'Demo Dos' },
];
