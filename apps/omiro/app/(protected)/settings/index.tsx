import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ProtectedRouteFallback } from '~/components/protected/protected-route-fallback';
import { AccountIdentitySection } from '~/components/settings/AccountIdentitySection';
import { DangerZoneSection } from '~/components/settings/DangerZoneSection';
import { PrivacySection } from '~/components/settings/PrivacySection';
import { SectionLabel, SettingsRow } from '~/components/settings/SettingsRow';
import { UsageSection } from '~/components/settings/UsageSection';
import { useAppTheme } from '~/components/theme';
import AppIcon from '~/components/ui/icon';
import { getAppLockEnabled, setAppLockEnabled } from '~/hooks/use-app-lock';
import { getPreventScreenshots, setPreventScreenshots } from '~/hooks/use-screen-capture';
import { useAuth } from '~/services/auth/auth-provider';
import { ARCHIVED_CHATS_ROUTE } from '~/services/navigation/routes';
import { useMonthlyUsage } from '~/services/usage/use-usage-query';
import t from '~/translations';

function Settings() {
  const router = useRouter();
  const { isPending, isSignedIn, signOut, currentUser, updateProfile } = useAuth();
  const { data: monthlyUsage } = useMonthlyUsage();
  const initialName = currentUser?.name ?? '';
  const [name, setName] = useState(initialName);
  const [preventScreenshots, setPreventScreenshotsState] = useState(getPreventScreenshots());
  const [appLock, setAppLockState] = useState(getAppLockEnabled());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const { tertiary: tertiaryColor } = useAppTheme().colors;

  const normalizedName = name.trim();
  const initialNormalizedName = initialName.trim();
  const nameChanged = normalizedName !== initialNormalizedName;

  useEffect(() => {
    if (saveStatus !== 'saved') {
      return;
    }

    const timeout = setTimeout(() => {
      setSaveStatus('idle');
    }, 1500);

    return () => clearTimeout(timeout);
  }, [saveStatus]);

  const onSavePress = async () => {
    if (!nameChanged) {
      return;
    }

    if (!normalizedName) {
      setSaveError(t.settings.name.errorEmpty);
      setSaveStatus('idle');
      return;
    }

    setSaveError(null);
    setSaveStatus('saving');

    try {
      await updateProfile({ name: normalizedName });
      setName(normalizedName);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('idle');
      setSaveError(error instanceof Error ? error.message : t.settings.name.errorSave);
    }
  };

  const onLogoutPress = () => {
    Alert.alert(t.settings.signOut.alertTitle, t.settings.signOut.alertMessage, [
      { text: t.settings.signOut.cancel, style: 'cancel' },
      { text: t.settings.signOut.confirm, style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const onArchivedChatsPress = () => {
    router.push(ARCHIVED_CHATS_ROUTE);
  };

  if (isPending || !isSignedIn) {
    return <ProtectedRouteFallback />;
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 24, paddingBottom: 24, paddingTop: 12 }}
      showsVerticalScrollIndicator={false}
    >
      <AccountIdentitySection
        currentUserId={currentUser?.id}
        email={currentUser?.email}
        name={name}
        nameChanged={nameChanged}
        onNameChange={(text) => {
          setName(text);
          setSaveError(null);
          setSaveStatus('idle');
        }}
        onSavePress={() => void onSavePress()}
        saveError={saveError}
        saveStatus={saveStatus}
      />

      {monthlyUsage ? <UsageSection monthlyUsage={monthlyUsage} /> : null}

      <PrivacySection
        appLock={appLock}
        onAppLockChange={(value) => {
          setAppLockState(value);
          setAppLockEnabled(value);
        }}
        onPreventScreenshotsChange={(value) => {
          setPreventScreenshotsState(value);
          setPreventScreenshots(value);
        }}
        preventScreenshots={preventScreenshots}
      />

      <View style={styles.chatsSection}>
        <SectionLabel>{t.settings.sections.chats}</SectionLabel>
        <SettingsRow
          icon="archivebox"
          label={t.settings.archivedChats}
          onPress={onArchivedChatsPress}
          accessory=<AppIcon name="chevron.right" size={12} tintColor={tertiaryColor} />
        />
      </View>

      <DangerZoneSection onLogoutPress={onLogoutPress} />
    </ScrollView>
  );
}

export default Settings;

const styles = StyleSheet.create({
  chatsSection: { gap: 8 },
});
