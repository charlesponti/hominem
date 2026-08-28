// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { getSpeechRecognitionConstructor, useSpeechToText } from './use-speech-to-text';

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: RecognitionResult[] };

class TestRecognition extends EventTarget {
  static instance: TestRecognition | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  started = 0;
  stopped = 0;
  onresult: ((event: RecognitionEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    super();
    TestRecognition.instance = this;
  }

  start() {
    this.started += 1;
  }

  stop() {
    this.stopped += 1;
  }
}

afterEach(() => {
  Reflect.deleteProperty(window, 'SpeechRecognition');
  Reflect.deleteProperty(window, 'webkitSpeechRecognition');
  TestRecognition.instance = null;
});

describe('useSpeechToText', () => {
  it('returns no constructor when no browser scope is available', () => {
    expect(getSpeechRecognitionConstructor(null)).toBeNull();
  });

  it('reports unsupported browsers and ignores start', async () => {
    const { result } = renderHook(() => useSpeechToText({ onTranscript: () => undefined }));

    await waitFor(() => expect(result.current.isSupported).toBe(false));
    act(() => result.current.start('seed'));

    expect(result.current.isListening).toBe(false);
    expect(TestRecognition.instance).toBeNull();
  });

  it('uses SpeechRecognition and combines seed, final, and interim text', async () => {
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: TestRecognition,
    });
    const transcripts: string[] = [];
    const { result } = renderHook(() =>
      useSpeechToText({ onTranscript: (text) => transcripts.push(text) }),
    );

    await waitFor(() => expect(result.current.isSupported).toBe(true));
    act(() => result.current.start('seed'));

    const recognition = TestRecognition.instance;
    expect(recognition?.continuous).toBe(true);
    expect(recognition?.interimResults).toBe(true);
    expect(recognition?.lang).toBe('en-US');
    expect(recognition?.started).toBe(1);
    expect(result.current.isListening).toBe(true);

    act(() =>
      recognition?.onresult?.({
        resultIndex: 0,
        results: [
          { isFinal: true, 0: { transcript: 'final' } },
          { isFinal: false, 0: { transcript: 'interim' } },
        ],
      }),
    );
    expect(transcripts).toEqual(['seed final interim']);

    act(() => recognition?.onerror?.());
    expect(result.current.isListening).toBe(false);
  });

  it('falls back to webkit recognition and supports toggle and end', async () => {
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      configurable: true,
      value: TestRecognition,
    });
    const { result } = renderHook(() => useSpeechToText({ onTranscript: () => undefined }));

    await waitFor(() => expect(result.current.isSupported).toBe(true));
    act(() => result.current.toggle());
    expect(result.current.isListening).toBe(true);

    const recognition = TestRecognition.instance;
    act(() => result.current.toggle());
    expect(recognition?.stopped).toBe(1);
    expect(result.current.isListening).toBe(false);

    act(() => result.current.start());
    act(() => recognition?.onend?.());
    expect(result.current.isListening).toBe(false);
  });

  it('stops recognition during unmount', async () => {
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: TestRecognition,
    });
    const { result, unmount } = renderHook(() =>
      useSpeechToText({ onTranscript: () => undefined }),
    );

    await waitFor(() => expect(result.current.isSupported).toBe(true));
    act(() => result.current.start());
    const recognition = TestRecognition.instance;
    unmount();

    expect(recognition?.stopped).toBe(1);
  });
});
