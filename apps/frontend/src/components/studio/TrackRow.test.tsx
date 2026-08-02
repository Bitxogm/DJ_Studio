import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Track } from '@beatforge/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UpdateTrackInput } from '@/lib/api/tracks';
import { useStudioStore } from '@/store/studio';
import { TrackRow } from './TrackRow';

const updateTrackRequestMock =
  vi.fn<(projectId: string, trackId: string, input: UpdateTrackInput) => Promise<Track>>();
vi.mock('@/lib/api/tracks', () => ({
  updateTrackRequest: (...args: [string, string, UpdateTrackInput]) =>
    updateTrackRequestMock(...args),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]): void => {
      toastError(...args);
    },
  },
}));

const baseTrack: Track = {
  id: 't1',
  projectId: 'p1',
  name: 'Kick',
  type: 'DRUM',
  order: 0,
  volume: 0.8,
  muted: false,
  soloed: false,
  instrumentConfig: {},
  sampleId: null,
  createdAt: '',
  updatedAt: '',
};

describe('TrackRow', () => {
  beforeEach(() => {
    updateTrackRequestMock.mockReset();
    toastError.mockClear();
    useStudioStore.setState({
      projects: [],
      selectedProjectId: null,
      tracks: [],
      isLoadingTracks: false,
    });
  });

  it('renderiza el nombre y un badge con el tipo de track (DRUM)', () => {
    render(<TrackRow track={baseTrack} projectId="p1" />);

    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('DRUM')).toBeInTheDocument();
  });

  it('renderiza correctamente otro tipo de track (SYNTH)', () => {
    render(<TrackRow track={{ ...baseTrack, type: 'SYNTH', name: 'Lead' }} projectId="p1" />);

    expect(screen.getByText('Lead')).toBeInTheDocument();
    expect(screen.getByText('SYNTH')).toBeInTheDocument();
  });

  it('al pulsar Mute, dispara la mutación con muted:true', async () => {
    updateTrackRequestMock.mockResolvedValueOnce({ ...baseTrack, muted: true });
    const user = userEvent.setup();
    render(<TrackRow track={baseTrack} projectId="p1" />);

    await user.click(screen.getByRole('button', { name: 'Mute' }));

    await waitFor(() => {
      expect(updateTrackRequestMock).toHaveBeenCalledWith('p1', 't1', { muted: true });
    });
  });

  it('al pulsar Solo, dispara la mutación con soloed:true', async () => {
    updateTrackRequestMock.mockResolvedValueOnce({ ...baseTrack, soloed: true });
    const user = userEvent.setup();
    render(<TrackRow track={baseTrack} projectId="p1" />);

    await user.click(screen.getByRole('button', { name: 'Solo' }));

    await waitFor(() => {
      expect(updateTrackRequestMock).toHaveBeenCalledWith('p1', 't1', { soloed: true });
    });
  });

  it('muestra un toast de error si falla la mutación de mute/solo', async () => {
    const { ApiRequestError } = await import('@/lib/api/httpError');
    updateTrackRequestMock.mockRejectedValueOnce(new ApiRequestError('No encontrado', 404));
    const user = userEvent.setup();
    render(<TrackRow track={baseTrack} projectId="p1" />);

    await user.click(screen.getByRole('button', { name: 'Mute' }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('No encontrado');
    });
  });
});
