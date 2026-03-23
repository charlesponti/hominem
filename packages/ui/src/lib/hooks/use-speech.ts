import { useCallback, useEffect, useState } from 'react';

export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const speak = useCallback(
    (id: string, text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      if (speakingId === id) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }

      window.speechSynthesis.cancel();
      setSpeakingId(id);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
    },
    [speakingId],
  );

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speakingId, speak, stop };
}