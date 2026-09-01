// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SpeechPlayer, type SpeechPlayerProps } from './speech-player';

vi.mock('~/components/chat/persona', () => ({
  Persona: ({ state }: { state: string }) => <span data-testid="persona">{state}</span>,
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

function renderPlayer(overrides: Partial<SpeechPlayerProps> = {}) {
  const props: SpeechPlayerProps = {
    isActive: true,
    messageId: 'message-1',
    onActivate: vi.fn(),
    onDeactivate: vi.fn(),
    src: '/speech',
    ...overrides,
  };
  return render(<SpeechPlayer {...props} />);
}

function renderHarness() {
  function Harness() {
    const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
    return (
      <>
        {['first', 'second'].map((messageId) => (
          <SpeechPlayer
            isActive={activeMessageId === messageId}
            key={messageId}
            messageId={messageId}
            onActivate={setActiveMessageId}
            onDeactivate={(id) => setActiveMessageId((active) => (active === id ? null : active))}
            src={`/${messageId}`}
          />
        ))}
      </>
    );
  }

  return render(<Harness />);
}

describe('SpeechPlayer', () => {
  it('keeps the speech action inline and scopes icon swaps to the action wrapper', () => {
    renderPlayer({ isActive: false });

    const player = document.querySelector('[data-speech-player]');
    const action = document.querySelector('[data-speech-action]');

    expect(player?.className).toContain('inline-flex');
    expect(action?.className).toContain('relative');
    expect(action?.className).toContain('size-7');
  });

  it('hides browser controls until playback starts', () => {
    renderPlayer({ isActive: false });

    expect(screen.getByTitle('Listen to response').hasAttribute('controls')).toBe(false);
    expect(screen.getByRole('button', { name: 'Listen to response' })).not.toBeNull();
  });

  it('keeps the live audio status out of transcript text selection', () => {
    renderPlayer();

    expect(screen.getByText('Listen to response').className).toContain('select-none');
  });

  it('shows the speaking Persona while audio is playing', () => {
    renderPlayer();
    const audio = screen.getByTitle('Listen to response');

    fireEvent.play(audio);

    expect(screen.getByTestId('persona').textContent).toBe('speaking');
    expect(screen.getByText('AI is speaking')).not.toBeNull();
  });

  it('resumes from a native pause when headphones are clicked again', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    renderPlayer();
    const audio = screen.getByTitle('Listen to response');

    fireEvent.play(audio);
    fireEvent.pause(audio);
    expect(screen.getByText('Response audio paused')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Listen to response' }));
    fireEvent.play(audio);

    expect(play).toHaveBeenCalledOnce();
    expect(screen.getByText('AI is speaking')).not.toBeNull();
  });

  it('keeps the Persona still when reduced motion is enabled', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        addEventListener: vi.fn(),
        matches: true,
        removeEventListener: vi.fn(),
      })),
    );
    renderPlayer();

    fireEvent.play(screen.getByTitle('Listen to response'));

    expect(screen.getByTestId('persona').textContent).toBe('idle');
  });

  it('stops playback and hides the player when the Persona is clicked', () => {
    vi.useFakeTimers();
    renderPlayer();
    const audio = screen.getByTitle('Listen to response');
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);

    fireEvent.play(audio);
    fireEvent.click(screen.getByRole('button', { name: 'Stop listening' }));

    expect(pause.mock.calls.length).toBeGreaterThan(0);
    expect(screen.getByTestId('persona').parentElement?.getAttribute('aria-hidden')).toBe('true');
    expect(audio.hasAttribute('controls')).toBe(false);

    vi.advanceTimersByTime(200);
    expect(screen.getByRole('button', { name: 'Listen to response' })).not.toBeNull();
  });

  it('removes the Persona when playback ends', () => {
    vi.useFakeTimers();
    renderPlayer();
    const audio = screen.getByTitle('Listen to response');

    fireEvent.play(audio);
    fireEvent.ended(audio);

    expect(screen.getByTestId('persona').parentElement?.getAttribute('aria-hidden')).toBe('true');
    expect(audio.hasAttribute('controls')).toBe(false);
    vi.advanceTimersByTime(200);
    expect(screen.getByText('Listen to response')).not.toBeNull();
  });

  it('pauses the previous response when playback starts elsewhere', () => {
    renderHarness();
    const audios = screen.getAllByTitle('Listen to response');
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);

    fireEvent.click(screen.getAllByRole('button', { name: 'Listen to response' })[0]);
    fireEvent.play(audios[0]);
    pause.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Listen to response' }));
    fireEvent.play(audios[1]);

    expect(pause).toHaveBeenCalled();
    expect(screen.getAllByTestId('persona')).toHaveLength(1);
  });

  it('announces an unavailable response without showing the Persona', () => {
    vi.useFakeTimers();
    renderPlayer();
    fireEvent.error(screen.getByTitle('Listen to response'));

    expect(screen.queryByTestId('persona')).toBeNull();
    expect(screen.getByText('Unable to play response audio')).not.toBeNull();
  });

  it('retries after an error', () => {
    renderPlayer();
    const audio = screen.getByTitle('Listen to response');
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);

    fireEvent.error(audio);
    fireEvent.click(screen.getByRole('button', { name: 'Retry response audio' }));
    fireEvent.play(audio);

    expect(play).toHaveBeenCalledOnce();
    expect(screen.getByText('AI is speaking')).not.toBeNull();
  });
});
