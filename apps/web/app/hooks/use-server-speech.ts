import { useApiClient } from '@hominem/rpc/react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseServerSpeechOptions {
  voice?: string;
  speed?: number;
}

interface UseServerSpeechResult {
  speakingId: string | null;
  loadingId: string | null;
  errorMessage: string | null;
  speak: (id: string, text: string) => Promise<void>;
  stop: () => void;
}

export function useServerSpeech(options: UseServerSpeechOptions = {}): UseServerSpeechResult {
  const client = useApiClient();
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cleanupSource = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.onended = null;
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // Source may already be stopped.
      }
    }

    cleanupSource();
    setLoadingId(null);
    setSpeakingId(null);
  }, [cleanupSource]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    return audioContextRef.current;
  }, []);

  const speak = useCallback(
    async (id: string, text: string) => {
      if (!text.trim()) return;

      if (speakingId === id || loadingId === id) {
        stop();
        return;
      }

      stop();
      setErrorMessage(null);

      const controller = new AbortController();
      abortRef.current = controller;
      setLoadingId(id);

      try {
        const arrayBuffer = await client.voice.speech({
          text,
          voice: options.voice ?? 'alloy',
          speed: options.speed ?? 1,
        });

        if (controller.signal.aborted) return;

        const ctx = getAudioContext();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
        if (controller.signal.aborted) return;

        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        source.onended = () => {
          cleanupSource();
          setSpeakingId((current) => (current === id ? null : current));
        };

        sourceRef.current = source;
        setLoadingId(null);
        setSpeakingId(id);
        source.start(0);
      } catch {
        setLoadingId(null);
        setSpeakingId(null);
        setErrorMessage('Audio playback unavailable. Please try again.');
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [
      cleanupSource,
      client.voice,
      getAudioContext,
      loadingId,
      options.speed,
      options.voice,
      speakingId,
      stop,
    ],
  );

  useEffect(() => {
    return () => {
      stop();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stop]);

  return {
    speakingId,
    loadingId,
    errorMessage,
    speak,
    stop,
  };
}
