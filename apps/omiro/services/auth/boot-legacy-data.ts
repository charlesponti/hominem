import * as SecureStore from 'expo-secure-store';

import { LocalStore } from '~/services/storage/local-store';

const LEGACY_LOCAL_DATA_MIGRATION_KEY = 'mobile_local_migration_v1';

export async function clearLegacyDataOnce() {
  const migrationFlag = await SecureStore.getItemAsync(LEGACY_LOCAL_DATA_MIGRATION_KEY);
  if (migrationFlag === '1') {
    return;
  }

  await LocalStore.clearAllData();
  await SecureStore.setItemAsync(LEGACY_LOCAL_DATA_MIGRATION_KEY, '1');
}
