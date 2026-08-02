'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@beatforge/shared';

import { loginRequest, logoutRequest, meRequest, registerRequest } from '@/lib/api/auth';
import type { LoginFormValues, RegisterFormValues } from '@/lib/validation/auth';

interface UseAuthResult {
  user: User | null;
  /** true mientras se resuelve la comprobación inicial de sesión vía /api/auth/me */
  isLoading: boolean;
  login: (input: LoginFormValues) => Promise<User>;
  register: (input: RegisterFormValues) => Promise<User>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void meRequest()
      .then((current) => {
        if (!cancelled) setUser(current);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginFormValues) => {
    const loggedInUser = await loginRequest(input);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (input: RegisterFormValues) => {
    const registeredUser = await registerRequest(input);
    setUser(registeredUser);
    return registeredUser;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  return { user, isLoading, login, register, logout };
}
