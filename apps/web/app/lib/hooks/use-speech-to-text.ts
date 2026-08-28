import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function isSpeechRecognitionConstructor(value: unknown): value is SpeechRecognitionConstructor {
  return typeof value === 'function';
}

export function getSpeechRecognitionConstructor(
  scope: object | null,
): SpeechRecognitionConstructor | null {
  if (!scope) return null;
  const speechRecognition = Reflect.get(scope, 'SpeechRecognition');
  if (isSpeechRecognitionConstructor(speechRecognition)) return speechRecognition;
  const webkitSpeechRecognition = Reflect.get(scope, 'webkitSpeechRecognition');
  return isSpeechRecognitionConstructor(webkitSpeechRecognition) ? webkitSpeechRecognition : null;
}

interface UseSpeechToTextOptions {
  /** Called with the full dictated text (seed + everything transcribed so far) on every update. */
  onTranscript: (fullText: string) => void;
}

export function useSpeechToText({ onTranscript }: UseSpeechToTextOptions) {
  // Starts false on both server and client so hydration matches; flips after
  // mount once we can safely check for the browser API.
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const seedRef = useRef('');
  const finalTextRef = useRef('');

  useEffect(() => {
    setIsSupported(getSpeechRecognitionConstructor(window) !== null);
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const start = useCallback(
    (seed = '') => {
      const Recognition = getSpeechRecognitionConstructor(window);
      if (!Recognition) return;

      seedRef.current = seed;
      finalTextRef.current = '';

      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTextRef.current += `${result[0].transcript} `;
          } else {
            interimText += result[0].transcript;
          }
        }
        const combined = [seedRef.current, finalTextRef.current + interimText]
          .filter((part) => part.trim().length > 0)
          .join(' ')
          .trim();
        onTranscript(combined);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    },
    [onTranscript],
  );

  const toggle = useCallback(
    (seed = '') => {
      if (isListening) {
        stop();
      } else {
        start(seed);
      }
    },
    [isListening, start, stop],
  );

  return { isSupported, isListening, start, stop, toggle };
}
