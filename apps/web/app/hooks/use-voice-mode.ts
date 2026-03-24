import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PCMPlayer } from '~/lib/audio/pcm-player';

export type VoiceModeState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

interface VoiceModeTurn {
  userTranscript: string;
  aiTranscript: string;
}

interface VoiceModeError {
  message: string;
}

interface UseVoiceModeResult {
  isActive: boolean;
  state: VoiceModeState;
  turns: VoiceModeTurn[];
  error: VoiceModeError | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  activate: () => void;
  deactivate: () => void;
}

function decodeHeaderTranscript(value: string | null): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function useVoiceMode(): UseVoiceModeResult {
  const [isActive, setIsActive] = useState(false);
  const [state, setState] = useState<VoiceModeState>('idle');
  const [turns, setTurns] = useState<VoiceModeTurn[]>([]);
  const [error, setError] = useState<VoiceModeError | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const pcmPlayerRef = useRef<PCMPlayer | null>(null);

  const apiBase = useMemo(() => import.meta.env.VITE_PUBLIC_API_URL as string, []);

  const stopTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) return;

    setState('processing');

    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      setState('error');
      setError({ message: 'Recorder unavailable.' });
      return;
    }

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        resolve(audioBlob);
      };

      recorder.stop();
    });

    isRecordingRef.current = false;
    stopTracks();

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'voice-mode.webm');
      formData.append('language', typeof navigator !== 'undefined' ? navigator.language : 'en-US');

      const response = await fetch(`${apiBase}/api/voice/respond`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Voice response failed');
      }

      const audioBuffer = await response.arrayBuffer();
      const userTranscript = decodeHeaderTranscript(response.headers.get('X-User-Transcript'));
      const aiTranscript = decodeHeaderTranscript(response.headers.get('X-AI-Transcript'));

      setTurns((current) => [...current, { userTranscript, aiTranscript }]);
      setState('speaking');

      if (!pcmPlayerRef.current) {
        pcmPlayerRef.current = new PCMPlayer();
      }

      await pcmPlayerRef.current.playPcm16(audioBuffer);
      setState(isActive ? 'listening' : 'idle');
      setError(null);
    } catch (err) {
      setState('error');
      setError({
        message: err instanceof Error ? err.message : 'Failed to complete voice response.',
      });
    }
  }, [apiBase, isActive, stopTracks]);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(100);
      isRecordingRef.current = true;
      setState('listening');
    } catch (err) {
      setState('error');
      setError({
        message: err instanceof Error ? err.message : 'Microphone access failed.',
      });
    }
  }, []);

  const deactivate = useCallback(() => {
    setIsActive(false);
    setState('idle');
    setError(null);

    if (isRecordingRef.current && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      isRecordingRef.current = false;
    }

    stopTracks();
    pcmPlayerRef.current?.stop();
  }, [stopTracks]);

  const activate = useCallback(() => {
    setIsActive(true);
    setState('idle');
  }, []);

  useEffect(() => {
    return () => {
      stopTracks();
      if (pcmPlayerRef.current) {
        void pcmPlayerRef.current.dispose();
      }
    };
  }, [stopTracks]);

  return {
    isActive,
    state,
    turns,
    error,
    startRecording,
    stopRecording,
    activate,
    deactivate,
  };
}
