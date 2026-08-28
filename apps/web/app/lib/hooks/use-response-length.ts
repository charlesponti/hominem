import { useEffect, useState } from 'react';

export type ResponseLength = 'short' | 'medium' | 'long';

const STORAGE_KEY = 'hominem:response-length';
const VALUES: ResponseLength[] = ['short', 'medium', 'long'];

function isResponseLength(value: string | null): value is ResponseLength {
  return value !== null && VALUES.some((candidate) => candidate === value);
}

export function useResponseLength() {
  const [responseLength, setResponseLength] = useState<ResponseLength>('medium');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isResponseLength(stored)) setResponseLength(stored);
  }, []);

  function updateResponseLength(value: string) {
    const next = isResponseLength(value) ? value : 'medium';
    setResponseLength(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return { responseLength, setResponseLength: updateResponseLength };
}
