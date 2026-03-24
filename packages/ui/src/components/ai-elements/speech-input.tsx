'use client';

import { emitVoiceEvent } from '@hominem/services/voice-events';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface SpeechInputProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onAudioRecorded?: (blob: Blob) => void;
  onTranscriptionChange?: (text: string) => void;
  onRecordingComplete?: (text: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onProcessingStateChange?: (isProcessing: boolean) => void;
  onAudioLevelChange?: (level: number) => void;
  onPermissionDenied?: () => void;
  ariaLabel?: string;
  language?: string;
}

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

type SpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
};

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function SpeechInput({
  onAudioRecorded,
  onTranscriptionChange,
  onRecordingComplete,
  onRecordingStateChange,
  onProcessingStateChange,
  onAudioLevelChange,
  onPermissionDenied,
  ariaLabel = 'Start voice input',
  language = 'en-US',
  className,
  ...props
}: SpeechInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const isStopRequestedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelRafIdRef = useRef<number | null>(null);
  const levelDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    onRecordingStateChange?.(isRecording);
  }, [isRecording, onRecordingStateChange]);

  useEffect(() => {
    onProcessingStateChange?.(isProcessing);
  }, [isProcessing, onProcessingStateChange]);

  const stopAudioLevelMonitor = useCallback(() => {
    if (levelRafIdRef.current !== null) {
      cancelAnimationFrame(levelRafIdRef.current);
      levelRafIdRef.current = null;
    }

    analyserRef.current = null;
    levelDataRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    onAudioLevelChange?.(0);
  }, [onAudioLevelChange]);

  const startAudioLevelMonitor = useCallback(
    (stream: MediaStream) => {
      const audioContext = new AudioContext();
      const sourceNode = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;

      sourceNode.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      levelDataRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));

      const updateLevel = () => {
        const activeAnalyser = analyserRef.current;
        const activeData = levelDataRef.current;

        if (!activeAnalyser || !activeData) return;

        activeAnalyser.getByteTimeDomainData(activeData);

        let sumSquares = 0;
        for (const sample of activeData) {
          const centered = (sample - 128) / 128;
          sumSquares += centered * centered;
        }

        const rms = Math.sqrt(sumSquares / activeData.length);
        const normalizedLevel = Math.min(1, Math.max(0, rms * 4));
        onAudioLevelChange?.(normalizedLevel);

        levelRafIdRef.current = requestAnimationFrame(updateLevel);
      };

      levelRafIdRef.current = requestAnimationFrame(updateLevel);
    },
    [onAudioLevelChange],
  );

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result?.[0]) {
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        onTranscriptionChange?.(currentTranscript);

        if (finalTranscript) {
          onRecordingComplete?.(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (_event: SpeechRecognitionErrorEvent) => {
        if (!isStopRequestedRef.current) {
          try {
            recognitionRef.current?.start();
            return;
          } catch {
            // Fall through to reset state
          }
        }

        setIsRecording(false);
        setIsProcessing(false);
      };

      recognitionRef.current.onend = () => {
        if (!isStopRequestedRef.current) {
          if (mediaRecorderRef.current?.state === 'recording') {
            try {
              recognitionRef.current?.start();
            } catch {
              // Keep recording; user can still stop manually.
            }
          }
          return;
        }

        setIsRecording(false);
      };
    }

    return () => {
      recognitionRef.current?.abort();
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      stopAudioLevelMonitor();
    };
  }, [
    language,
    onAudioRecorded,
    onRecordingComplete,
    onTranscriptionChange,
    stopAudioLevelMonitor,
  ]);

  const startRecording = useCallback(async () => {
    if (!recognitionRef.current || isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsPermissionDenied(false);
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      isStopRequestedRef.current = false;

      startAudioLevelMonitor(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          onAudioRecorded?.(audioBlob);
        }

        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        stopAudioLevelMonitor();
        setIsProcessing(false);
      };

      mediaRecorderRef.current.start(100);
      recognitionRef.current.start();
      setIsRecording(true);

      emitVoiceEvent('voice_record_started', {
        platform: 'web',
        transport: 'hono-rpc',
      });
    } catch {
      setIsRecording(false);
      setIsProcessing(false);
      setIsPermissionDenied(true);
      stopAudioLevelMonitor();
      onPermissionDenied?.();
    }
  }, [
    isRecording,
    onAudioRecorded,
    onPermissionDenied,
    startAudioLevelMonitor,
    stopAudioLevelMonitor,
  ]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    isStopRequestedRef.current = true;

    recognitionRef.current?.stop();

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    stopAudioLevelMonitor();

    setIsRecording(false);
    setIsProcessing(true);

    emitVoiceEvent('voice_record_stopped', {
      platform: 'web',
      transport: 'hono-rpc',
    });
  }, [isRecording, stopAudioLevelMonitor]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative">
      <span className="sr-only" role="status" aria-live="polite">
        {isRecording
          ? 'Recording in progress'
          : isProcessing
            ? 'Processing recording'
            : 'Recording idle'}
      </span>
      <Button
        type="button"
        variant={isRecording ? 'destructive' : 'default'}
        size="icon"
        aria-label={isRecording ? 'Stop recording' : ariaLabel}
        className={cn('', className)}
        onClick={toggleRecording}
        disabled={isProcessing}
        {...props}
      >
        {isProcessing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="size-4" />
        ) : (
          <Mic className="size-4" />
        )}
      </Button>
      {isRecording && (
        <span className="absolute -top-1 -right-1 flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/70 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
        </span>
      )}
      {isPermissionDenied ? (
        <span className="sr-only" role="alert">
          Microphone access denied
        </span>
      ) : null}
    </div>
  );
}
