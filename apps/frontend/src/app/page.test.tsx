import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

describe('HomePage', () => {
  it('renderiza el título BeatForge', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'BeatForge' })).toBeInTheDocument();
  });
});
