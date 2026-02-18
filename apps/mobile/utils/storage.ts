import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'com.pontistudios.mindsherpa',
  encryptionKey: 'com.pontistudios.mindsherpa.encryption',
});
