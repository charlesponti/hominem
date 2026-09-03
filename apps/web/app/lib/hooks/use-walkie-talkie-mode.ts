import { useEffect, useState } from 'react';

const STORAGE_KEY = 'hominem:walkie-talkie-mode';

export function useWalkieTalkieMode() {
  const [walkieTalkieMode, setWalkieTalkieModeState] = useState(false);

  useEffect(() => {
    setWalkieTalkieModeState(window.localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  function setWalkieTalkieMode(value: boolean) {
    setWalkieTalkieModeState(value);
    window.localStorage.setItem(STORAGE_KEY, String(value));
  }

  return { walkieTalkieMode, setWalkieTalkieMode };
}
