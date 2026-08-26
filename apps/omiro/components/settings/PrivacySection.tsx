import { Switch, View } from 'react-native';

import { makeStyles } from '~/components/theme';
import { SectionLabel, SettingsRow } from '~/components/settings/SettingsRow';
import t from '~/translations';

export function PrivacySection({
  appLock,
  onAppLockChange,
  onPreventScreenshotsChange,
  preventScreenshots,
}: {
  appLock: boolean;
  onAppLockChange: (value: boolean) => void;
  onPreventScreenshotsChange: (value: boolean) => void;
  preventScreenshots: boolean;
}) {
  return (
    <View style={styles.privacySection}>
      <SectionLabel>{t.settings.sections.privacy}</SectionLabel>
      <SettingsRow
        icon="faceid"
        label={t.settings.lockWithFaceId}
        accessory={<Switch value={appLock} onValueChange={onAppLockChange} />}
      />
      <SettingsRow
        icon="eye.slash"
        label={t.settings.preventScreenshots}
        accessory={<Switch value={preventScreenshots} onValueChange={onPreventScreenshotsChange} />}
      />
    </View>
  );
}

const styles = makeStyles(() => ({
  privacySection: { gap: 8 },
}));
