import { emitVoiceEvent, type VoiceDiscardReason } from '@hominem/rpc/voice-events';
import { logger } from '@hominem/telemetry';
import * as Audio from 'expo-audio';
import AudioModule from 'expo-audio/build/AudioModule';
import { File } from 'expo-file-system';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export type RecorderState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'PREPARING'
  | 'RECORDING'
  | 'PAUSED'
  | 'STOPPING';

export type DiscardReason = VoiceDiscardReason;

export function isRecorderActive(state: RecorderState) {
  return (
    state === 'REQUESTING_PERMISSION' ||
    state === 'PREPARING' ||
    state === 'RECORDING' ||
    state === 'PAUSED' ||
    state === 'STOPPING'
  );
}

type RecordingSnapshot = {
  lastRecordingUri: string | null;
  meterings: number[];
  state: RecorderState;
  ownerId: string | null;
  startedAt: number | null;
};

// The fields consumers other than the level meter actually care about.
// `meterings` changes on every 100ms poll tick, so any `useSyncExternalStore`
// selector reading the full snapshot re-renders at that rate — this excludes
// it and keeps a stable object reference across polls where nothing else
// changed, so React can bail out of re-rendering.
export type RecordingCoreSnapshot = Omit<RecordingSnapshot, 'meterings'>;

type AudioRecorder = InstanceType<typeof AudioModule.AudioRecorder>;

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
    updateSnapshot: (updater: (current: T) => T) => {
      snapshot = updater(snapshot);
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

function createRecordingController() {
  const store = createStore<RecordingSnapshot>({
    lastRecordingUri: null,
    meterings: [],
    state: 'IDLE',
    ownerId: null,
    startedAt: null,
  });

  let recorder: AudioRecorder | null = null;
  let pollHandle: ReturnType<typeof setInterval> | null = null;

  const ensureRecorder = () => {
    if (!recorder) {
      recorder = new AudioModule.AudioRecorder({
        ...Audio.RecordingPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
    }

    return recorder as AudioRecorder;
  };

  const sync = () => {
    if (!recorder) return;

    const status = recorder.getStatus();
    const metering = status.metering;

    store.updateSnapshot((current) => ({
      ...current,
      meterings:
        typeof metering === 'number'
          ? [...current.meterings, metering].slice(-12)
          : current.meterings,
    }));
  };

  const startPolling = () => {
    if (pollHandle) return;

    pollHandle = setInterval(sync, 100);
    sync();
  };

  const stopPolling = () => {
    if (!pollHandle) return;

    clearInterval(pollHandle);
    pollHandle = null;
  };

  const setState = (state: RecorderState) => {
    store.updateSnapshot((current) => ({ ...current, state }));
  };

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    clearRecording: () => {
      store.setSnapshot({
        lastRecordingUri: null,
        meterings: [],
        state: 'IDLE',
        ownerId: null,
        startedAt: null,
      });
    },
    pauseRecording: () => {
      if (store.getSnapshot().state !== 'RECORDING') return;

      recorder?.pause();
      setState('PAUSED');
    },
    resumeRecording: () => {
      if (store.getSnapshot().state !== 'PAUSED') return;

      recorder?.record();
      setState('RECORDING');
    },
    startRecording: async (ownerId: string) => {
      if (store.getSnapshot().state !== 'IDLE') {
        return { ok: false as const, reason: 'busy' as const };
      }

      logger.info('[recorder] start requested', {
        state: store.getSnapshot().state,
      });

      setState('REQUESTING_PERMISSION');

      const permission = await Audio.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setState('IDLE');
        return { ok: false as const, reason: 'permission-denied' as const };
      }

      setState('PREPARING');

      await Audio.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      activateKeepAwakeAsync().catch((error: Error) =>
        logger.error('[recorder] keep-awake activation failed', error),
      );

      try {
        const nextRecorder = ensureRecorder();
        await nextRecorder.prepareToRecordAsync();
        nextRecorder.record();
        store.updateSnapshot((current) => ({
          ...current,
          meterings: [],
          state: 'RECORDING',
          ownerId,
          startedAt: Date.now(),
        }));
        logger.info('[recorder] recording started', {
          state: 'RECORDING',
        });
        emitVoiceEvent('voice_record_started', { platform: 'mobile-ios' });
        startPolling();
        return { ok: true as const };
      } catch (error) {
        logger.error('[recorder] start failed', error as Error);
        setState('IDLE');
        await deactivateKeepAwake().catch((nextError: Error) =>
          logger.error('[recorder] keep-awake deactivation failed', nextError),
        );
        return { ok: false as const, reason: 'error' as const };
      }
    },
    stopRecording: async (ownerId: string) => {
      const current = store.getSnapshot();
      if (current.state === 'IDLE' || current.state === 'STOPPING') {
        return { ok: false as const, reason: 'no-recording' as const };
      }

      if (current.ownerId !== null && current.ownerId !== ownerId) {
        return { ok: false as const, reason: 'not-owner' as const };
      }

      logger.info('[recorder] stop requested', {
        state: current.state,
      });

      setState('STOPPING');

      try {
        await recorder?.stop();
      } catch (error) {
        logger.error('[recorder] stop failed', error as Error);
      }

      stopPolling();

      await deactivateKeepAwake().catch((error: Error) =>
        logger.error('[recorder] keep-awake deactivation failed', error),
      );

      const fileUri = recorder?.uri ?? null;

      logger.info('[recorder] recording stopped', {
        fileUri,
        hadRecording: !!fileUri,
      });

      store.setSnapshot({
        lastRecordingUri: fileUri ?? current.lastRecordingUri,
        meterings: [],
        state: 'IDLE',
        ownerId: null,
        startedAt: null,
      });

      if (fileUri) {
        emitVoiceEvent('voice_record_stopped', { platform: 'mobile-ios' });
      }

      return { ok: true as const, fileUri };
    },
    discardRecording: async (ownerId: string, reason: DiscardReason) => {
      const current = store.getSnapshot();
      if (current.state === 'IDLE' || current.state === 'STOPPING') {
        return { ok: false as const, reason: 'no-recording' as const };
      }

      if (current.ownerId !== null && current.ownerId !== ownerId) {
        return { ok: false as const, reason: 'not-owner' as const };
      }

      logger.info('[recorder] discard requested', {
        state: current.state,
        reason,
      });

      setState('STOPPING');

      try {
        await recorder?.stop();
      } catch (error) {
        logger.error('[recorder] discard stop failed', error as Error);
      }

      stopPolling();

      await deactivateKeepAwake().catch((error: Error) =>
        logger.error('[recorder] keep-awake deactivation failed', error),
      );

      const fileUri = recorder?.uri ?? null;
      if (fileUri) {
        try {
          new File(fileUri).delete();
        } catch (error) {
          logger.error('[recorder] discard file delete failed', error as Error);
        }
      }

      store.setSnapshot({
        lastRecordingUri: current.lastRecordingUri,
        meterings: [],
        state: 'IDLE',
        ownerId: null,
        startedAt: null,
      });

      emitVoiceEvent('voice_record_discarded', { platform: 'mobile-ios', reason });

      return { ok: true as const };
    },
  };
}

const recording = createRecordingController();

let coreSnapshot: RecordingCoreSnapshot = {
  lastRecordingUri: null,
  state: 'IDLE',
  ownerId: null,
  startedAt: null,
};

function toCoreSnapshot(snapshot: RecordingSnapshot): RecordingCoreSnapshot {
  if (
    coreSnapshot.lastRecordingUri === snapshot.lastRecordingUri &&
    coreSnapshot.state === snapshot.state &&
    coreSnapshot.ownerId === snapshot.ownerId &&
    coreSnapshot.startedAt === snapshot.startedAt
  ) {
    return coreSnapshot;
  }

  coreSnapshot = {
    lastRecordingUri: snapshot.lastRecordingUri,
    state: snapshot.state,
    ownerId: snapshot.ownerId,
    startedAt: snapshot.startedAt,
  };
  return coreSnapshot;
}

export function getRecordingSnapshot() {
  return recording.getSnapshot();
}

// Same store as getRecordingSnapshot, minus `meterings` — use this in
// useSyncExternalStore when you don't need per-poll metering data, so
// components don't re-render 10x/sec during a recording.
export function getRecordingCoreSnapshot(): RecordingCoreSnapshot {
  return toCoreSnapshot(recording.getSnapshot());
}

export function subscribeRecording(listener: Listener<RecordingSnapshot>) {
  return recording.subscribe(listener);
}

export async function startRecording(ownerId: string) {
  return recording.startRecording(ownerId);
}

export async function stopRecording(ownerId: string) {
  return recording.stopRecording(ownerId);
}

export async function discardRecording(ownerId: string, reason: DiscardReason) {
  return recording.discardRecording(ownerId, reason);
}
