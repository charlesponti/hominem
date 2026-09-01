import { Redirect } from 'expo-router';

import { enableTestMode } from '~/services/testing/test-mode';

// Called synchronously at module load so MMKV gets written before React starts rendering/running effects.
enableTestMode();

export default function EnableTestMode() {
  return <Redirect href="/" />;
}
