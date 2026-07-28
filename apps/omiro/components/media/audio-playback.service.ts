import { logger } from '@hominem/telemetry';
import * as Audio from 'expo-audio';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

type PlaybackSnapshot = {
  activeMessageId: string | null;
  playing: boolean;
};

type Listener<T> = (snapshot: T) => void;

function createStore<T>(initialValue: T) {
  let snapshot = initialValue;
  const listeners = new Set<Listener<T>>();

  const emit = () => {
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  return {
    getSnapshot: () => snapshot,
    setSnapshot: (next: T) => {
      snapshot = next;
      emit();
    },
    subscribe: (listener: Listener<T>) => {
      listeners.add(listener);
      listener(snapshot);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

// Sibling to audio.service.ts, but for playback: a single-active-player
// singleton (only one reply plays at a time — starting a new one stops
// whatever was playing), keyed by chat message id rather than a recording
// ownerId. Uses expo-audio's non-hook createAudioPlayer so it's addressable
// from module-level callers (SSE event handlers, chat-message action
// buttons) rather than tied to one component's lifecycle.
function createPlaybackController() {
  const store = createStore<PlaybackSnapshot>({ activeMessageId: null, playing: false });
  let player: AudioPlayer | null = null;
  let audioModeReady = false;

  const ensureAudioMode = () => {
    if (audioModeReady) return;
    audioModeReady = true;
    // playsInSilentMode already defaults to true in this SDK, and
    // audio.service.ts's recording session may have set allowsRecording —
    // leave that alone here, this is just a defensive no-op safeguard.
    Audio.setAudioModeAsync({ playsInSilentMode: true }).catch((error: Error) =>
      logger.error('[audio-playback] set audio mode failed', error),
    );
  };

  const teardownPlayer = () => {
    if (!player) return;
    try {
      player.remove();
    } catch (error) {
      logger.error('[audio-playback] player teardown failed', error as Error);
    }
    player = null;
  };

  const stop = () => {
    teardownPlayer();
    store.setSnapshot({ activeMessageId: null, playing: false });
  };

  const play = (messageId: string, url: string) => {
    const current = store.getSnapshot();
    if (current.activeMessageId === messageId && current.playing) {
      stop();
      return;
    }

    teardownPlayer();
    ensureAudioMode();

    const nextPlayer = createAudioPlayer({ uri: url });
    player = nextPlayer;
    store.setSnapshot({ activeMessageId: messageId, playing: true });

    nextPlayer.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        stop();
      }
    });

    try {
      nextPlayer.play();
    } catch (error) {
      logger.error('[audio-playback] play failed', error as Error);
      stop();
    }
  };

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    play,
    stop,
  };
}

const playback = createPlaybackController();

export function getPlaybackSnapshot() {
  return playback.getSnapshot();
}

export function subscribePlayback(listener: Listener<PlaybackSnapshot>) {
  return playback.subscribe(listener);
}

export function playAudioReply(messageId: string, url: string) {
  playback.play(messageId, url);
}

export function stopAudioReply() {
  playback.stop();
}
