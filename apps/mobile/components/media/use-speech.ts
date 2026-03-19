import * as Speech from 'expo-speech';
import { useCallback, useEffect, useState } from 'react';

export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const speak = useCallback(
    (id: string, text: string) => {
      if (speakingId === id) {
        Speech.stop();
        setSpeakingId(null);
        return;
      }

      Speech.stop();
      setSpeakingId(id);
      Speech.speak(text, {
        onDone: () => setSpeakingId(null),
        onStopped: () => setSpeakingId(null),
        onError: () => setSpeakingId(null),
      });
    },
    [speakingId],
  );

  const stop = useCallback(() => {
    Speech.stop();
    setSpeakingId(null);
  }, []);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  return { speakingId, speak, stop };
}
