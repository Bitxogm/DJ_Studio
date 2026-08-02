import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from './LoginForm';

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

describe('LoginForm', () => {
  beforeEach(() => {
    pushMock.mockClear();
    loginMock.mockReset();
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  it('renderiza los campos de email y contraseña', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('muestra un error inline si el email no es válido', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'no-es-un-email');
    await user.type(screen.getByLabelText('Contraseña'), 'algo');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Introduce un email válido')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('muestra un error inline si la contraseña está vacía', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'valido@ejemplo.com');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('La contraseña es obligatoria')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('llama a login con los datos del formulario y redirige a /studio', async () => {
    loginMock.mockResolvedValueOnce({
      id: '1',
      email: 'valido@ejemplo.com',
      displayName: 'Void',
      createdAt: '',
      updatedAt: '',
    });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'valido@ejemplo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'valido@ejemplo.com',
        password: 'password123',
      });
    });
    expect(pushMock).toHaveBeenCalledWith('/studio');
  });

  it('muestra un toast de error cuando el servidor rechaza las credenciales', async () => {
    const { AuthApiError } = await import('@/lib/api/auth');
    loginMock.mockRejectedValueOnce(
      new AuthApiError('Email o contraseña incorrectos', 401, 'INVALID_CREDENTIALS'),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'valido@ejemplo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'password-equivocada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Email o contraseña incorrectos');
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
