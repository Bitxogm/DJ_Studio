import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegisterForm } from './RegisterForm';

const pushMock = vi.fn();
const registerMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    login: vi.fn(),
    register: registerMock,
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

describe('RegisterForm', () => {
  beforeEach(() => {
    pushMock.mockClear();
    registerMock.mockReset();
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  it('renderiza los campos de nombre, email y contraseña', () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('muestra un error inline si falta el nombre', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText('Email'), 'valido@ejemplo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('muestra un error inline si la contraseña tiene menos de 8 caracteres', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText('Nombre'), 'Void');
    await user.type(screen.getByLabelText('Email'), 'valido@ejemplo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'corta');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText('La contraseña debe tener al menos 8 caracteres'),
    ).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('llama a register con los datos del formulario y redirige a /studio', async () => {
    registerMock.mockResolvedValueOnce({
      id: '1',
      email: 'valido@ejemplo.com',
      displayName: 'Void',
      createdAt: '',
      updatedAt: '',
    });
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText('Nombre'), 'Void');
    await user.type(screen.getByLabelText('Email'), 'valido@ejemplo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith({
        email: 'valido@ejemplo.com',
        password: 'password123',
        displayName: 'Void',
      });
    });
    expect(pushMock).toHaveBeenCalledWith('/studio');
  });

  it('muestra un toast de error cuando el email ya está registrado', async () => {
    const { AuthApiError } = await import('@/lib/api/auth');
    registerMock.mockRejectedValueOnce(
      new AuthApiError('Este email ya está registrado', 409, 'EMAIL_TAKEN'),
    );
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText('Nombre'), 'Void');
    await user.type(screen.getByLabelText('Email'), 'repetido@ejemplo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Este email ya está registrado');
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
