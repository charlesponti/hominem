'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
} from 'react';

import { Mic, MicOff, Loader2 } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface SpeechInputProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onAudioRecorded?: (blob: Blob) => void;
  onTranscriptionChange?: (text: string) => void;
  onRecordingComplete?: (text: string) => void;
  ariaLabel?: string;
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
  ariaLabel = 'Start voice input',
  className,
  ...props
}: SpeechInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

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
        setTranscript(currentTranscript);
        onTranscriptionChange?.(currentTranscript);

        if (finalTranscript) {
          onRecordingComplete?.(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setIsProcessing(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setIsProcessing(false);
        if (mediaRecorderRef.current && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          onAudioRecorded?.(audioBlob);
        }
      };
    }

    return () => {
      recognitionRef.current?.abort();
    };
  }, [onAudioRecorded, onTranscriptionChange, onRecordingComplete]);

  const startRecording = useCallback(async () => {
    if (!recognitionRef.current || isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start(100);
      recognitionRef.current.start();
      setIsRecording(true);
      setTranscript('');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();

    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());

    setIsRecording(false);
    setIsProcessing(true);
  }, [isRecording]);

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
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
      )}
    </div>
  );
}
