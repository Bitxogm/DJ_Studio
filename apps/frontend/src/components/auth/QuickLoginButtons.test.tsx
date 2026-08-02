import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QuickLoginButtons } from './QuickLoginButtons';

const pushMock = vi.fn();
const loginMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    login: loginMock,
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]): void => {
      toastSuccess(...args);
    },
    error: (...args: unknown[]): void => {
      toastError(...args);
    },
  },
}));

describe('QuickLoginButtons', () => {
  beforeEach(() => {
    pushMock.mockClear();
    loginMock.mockReset();
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('no renderiza nada fuera de NODE_ENV=development (gate de producción)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { container } = render(<QuickLoginButtons />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza los dos usuarios demo en desarrollo', () => {
    vi.stubEnv('NODE_ENV', 'development');
    render(<QuickLoginButtons />);

    expect(screen.getByRole('button', { name: /Demo Uno/ })).toBeInTheDocument();
    expect(screen.getByText('dev1@beatforge.local')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Demo Dos/ })).toBeInTheDocument();
    expect(screen.getByText('dev2@beatforge.local')).toBeInTheDocument();
  });

  it('al pulsar un usuario demo, llama a login con sus credenciales y redirige a /studio', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    loginMock.mockResolvedValueOnce({
      id: '1',
      email: 'dev1@beatforge.local',
      displayName: 'Demo Uno',
      createdAt: '',
      updatedAt: '',
    });
    const user = userEvent.setup();
    render(<QuickLoginButtons />);

    await user.click(screen.getByRole('button', { name: /Demo Uno/ }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'dev1@beatforge.local',
        password: 'Demo1234!',
      });
    });
    expect(pushMock).toHaveBeenCalledWith('/studio');
  });

  it('muestra un toast de error si el login del usuario demo falla', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { AuthApiError } = await import('@/lib/api/auth');
    loginMock.mockRejectedValueOnce(new AuthApiError('No se pudo conectar con el servidor', 502));
    const user = userEvent.setup();
    render(<QuickLoginButtons />);

    await user.click(screen.getByRole('button', { name: /Demo Dos/ }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('No se pudo conectar con el servidor');
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
