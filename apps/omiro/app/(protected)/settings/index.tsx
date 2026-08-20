import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import React, { useEffect, useReducer, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { ProtectedRouteFallback } from '~/components/protected/protected-route-fallback';
import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';
import { TextField } from '~/components/ui';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import { getAppLockEnabled, setAppLockEnabled } from '~/hooks/use-app-lock';
import { getPreventScreenshots, setPreventScreenshots } from '~/hooks/use-screen-capture';
import { useAuth } from '~/services/auth/auth-provider';
import { ARCHIVED_CHATS_ROUTE } from '~/services/navigation/routes';
import { useMonthlyUsage } from '~/services/usage/use-usage-query';
import t from '~/translations';

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function getInitials(name: string, fallback: string): string {
  const source = name.trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface AccountState {
  name: string;
  preventScreenshots: boolean;
  appLock: boolean;
}

type AccountAction =
  | { type: 'set-name'; name: string }
  | { type: 'set-prevent-screenshots'; preventScreenshots: boolean }
  | { type: 'set-app-lock'; appLock: boolean };

function accountReducer(state: AccountState, action: AccountAction): AccountState {
  switch (action.type) {
    case 'set-name':
      return { ...state, name: action.name };
    case 'set-prevent-screenshots':
      return { ...state, preventScreenshots: action.preventScreenshots };
    case 'set-app-lock':
      return { ...state, appLock: action.appLock };
  }
}

function SettingsRow({
  icon,
  label,
  description,
  onPress,
  accessory,
  destructive,
  testID,
}: {
  icon: SFSymbol;
  label: string;
  description?: string;
  onPress?: () => void;
  accessory?: React.ReactNode;
  destructive?: boolean;
  testID?: string;
}) {
  const [destructiveColor, textPrimaryColor, tertiaryColor] = useThemeColor([
    '--color-destructive',
    '--color-foreground',
    '--color-tertiary',
  ]) as string[];

  const labelColor = destructive ? destructiveColor : textPrimaryColor;

  const content = (
    <View style={[styles.s0, { minHeight: 44 }]}>
      <View style={styles.s1}>
        <AppIcon name={icon} size={18} tintColor={destructive ? destructiveColor : tertiaryColor} />
        <View style={styles.s2}>
          <Text style={[styles.s3, { color: labelColor }]}>{label}</Text>
          {description ? <Text style={styles.s4}>{description}</Text> : null}
        </View>
      </View>
      {accessory}
    </View>
  );

  if (!onPress) {
    return (
      <View testID={testID} style={styles.s5}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.s6, pressed ? { opacity: 0.6 } : undefined]}
    >
      {content}
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.s7}>{children}</Text>;
}

function Settings() {
  const router = useRouter();
  const { isPending, isSignedIn, signOut, currentUser, updateProfile } = useAuth();
  const { data: monthlyUsage } = useMonthlyUsage();
  const initialName = currentUser?.name ?? '';
  const [state, dispatch] = useReducer(accountReducer, {
    name: initialName,
    preventScreenshots: getPreventScreenshots(),
    appLock: getAppLockEnabled(),
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const [popoverColor, textPrimaryColor, tertiaryColor, borderDefaultColor, destructiveColor] =
    useThemeColor([
      '--color-popover',
      '--color-foreground',
      '--color-tertiary',
      '--color-border',
      '--color-destructive',
    ]) as string[];

  const normalizedName = state.name.trim();
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
      dispatch({ type: 'set-name', name: normalizedName });
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

  const onDeleteAccountPress = () => {
    Alert.alert(t.settings.deleteAccount.alertTitle, t.settings.deleteAccount.alertMessage, [
      { text: t.settings.deleteAccount.ok, style: 'default' },
    ]);
  };

  const onArchivedChatsPress = () => {
    router.push(ARCHIVED_CHATS_ROUTE);
  };

  const onUiLabPress = () => {
    router.push('/(protected)/dev/ui-lab');
  };

  if (isPending || !isSignedIn) {
    return <ProtectedRouteFallback />;
  }

  const usagePercent = monthlyUsage
    ? Math.min(100, (monthlyUsage.totalCostUsd / monthlyUsage.limitUsd) * 100)
    : 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 24, paddingBottom: 24, paddingTop: 12 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Identity */}
      <View style={styles.s8}>
        <View style={[styles.s9, { backgroundColor: popoverColor }]}>
          <Text style={styles.s10}>{getInitials(state.name, currentUser?.email ?? '?')}</Text>
        </View>
        <View style={styles.s11}>
          <TextField
            key={`name-${currentUser?.id ?? 'anonymous'}`}
            value={state.name}
            placeholder={t.settings.name.placeholder}
            returnKeyType="done"
            selectionColor={textPrimaryColor}
            cursorColor={textPrimaryColor}
            style={[styles.s12, { borderWidth: 0, color: textPrimaryColor }]}
            onChangeText={(text) => {
              dispatch({ type: 'set-name', name: text });
              setSaveError(null);
              setSaveStatus('idle');
            }}
            onSubmitEditing={() => {
              if (nameChanged) {
                void onSavePress();
              }
            }}
          />
          <Text style={styles.s13}>{currentUser?.email ?? t.settings.emailMissing}</Text>
        </View>
      </View>

      {nameChanged ? (
        <View style={styles.s14}>
          <Button
            label={saveStatus === 'saving' ? t.settings.name.saving : t.settings.name.save}
            onPress={() => void onSavePress()}
            disabled={saveStatus === 'saving'}
            variant="secondary"
            size="sm"
          />
        </View>
      ) : null}
      {saveStatus === 'saved' ? <Text style={styles.s15}>{t.settings.name.saved}</Text> : null}
      {saveError ? <Text style={styles.s16}>{saveError}</Text> : null}

      {/* Usage */}
      {monthlyUsage ? (
        <View testID="settings-usage-section" style={styles.s17}>
          <SectionLabel>AI usage this month</SectionLabel>
          <View style={styles.s18}>
            <Text style={[styles.s19, { fontVariant: ['tabular-nums'] }]}>
              {formatUsd(monthlyUsage.totalCostUsd)}
            </Text>
            <Text style={[styles.s20, { fontVariant: ['tabular-nums'] }]}>
              of {formatUsd(monthlyUsage.limitUsd)} · {usagePercent.toFixed(0)}%
            </Text>
          </View>
          <View style={[styles.s21, { backgroundColor: borderDefaultColor }]}>
            <View
              style={[
                styles.s22,
                {
                  width: `${usagePercent}%`,
                  backgroundColor: monthlyUsage.isOverLimit ? destructiveColor : textPrimaryColor,
                },
              ]}
            />
          </View>
          <Text style={styles.s23}>
            {monthlyUsage.isOverLimit
              ? "You've reached this month's free AI usage limit. It resets at the start of next month."
              : 'Resets at the start of next month.'}
          </Text>
        </View>
      ) : null}

      {/* Privacy */}
      <View style={styles.s24}>
        <SectionLabel>{t.settings.sections.privacy}</SectionLabel>
        <SettingsRow
          icon="faceid"
          label={t.settings.lockWithFaceId}
          accessory={
            <Switch
              value={state.appLock}
              onValueChange={(value) => {
                dispatch({ type: 'set-app-lock', appLock: value });
                setAppLockEnabled(value);
              }}
            />
          }
        />
        <SettingsRow
          icon="eye.slash"
          label={t.settings.preventScreenshots}
          accessory={
            <Switch
              value={state.preventScreenshots}
              onValueChange={(value) => {
                dispatch({ type: 'set-prevent-screenshots', preventScreenshots: value });
                setPreventScreenshots(value);
              }}
            />
          }
        />
      </View>

      {/* Chats */}
      <View style={styles.s25}>
        <SectionLabel>{t.settings.sections.chats}</SectionLabel>
        <SettingsRow
          icon="archivebox"
          label={t.settings.archivedChats}
          onPress={onArchivedChatsPress}
          accessory={<AppIcon name="chevron.right" size={12} tintColor={tertiaryColor} />}
        />
      </View>

      {__DEV__ ? (
        <View style={styles.s26}>
          <SectionLabel>Development</SectionLabel>
          <SettingsRow
            icon="rectangle.3.group"
            label="UI Lab"
            onPress={onUiLabPress}
            testID="settings-ui-lab"
            accessory={<AppIcon name="chevron.right" size={12} tintColor={tertiaryColor} />}
          />
        </View>
      ) : null}

      {/* Danger zone */}
      <View style={styles.s27}>
        <SettingsRow
          icon="rectangle.portrait.and.arrow.right"
          label={t.settings.signOut.label}
          onPress={onLogoutPress}
        />
        <SettingsRow
          icon="trash"
          label={t.settings.deleteAccount.label}
          onPress={onDeleteAccountPress}
          destructive
        />
      </View>
    </ScrollView>
  );
}

export default Settings;

const styles = makeStyles((theme) => ({
  s0: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  s1: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  s2: { flex: 1, gap: 2 },
  s3: {},
  s4: { fontSize: 13, color: theme.colors.mutedForeground },
  s5: { paddingHorizontal: 16 },
  s6: { paddingHorizontal: 16 },
  s7: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.mutedForeground,
    paddingHorizontal: 16,
  },
  s8: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  s9: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, height: 52, width: 52 },
  s10: { fontSize: 19, fontWeight: '700', color: theme.colors.foreground },
  s11: { flex: 1, gap: 2 },
  s12: { fontSize: 20, fontWeight: '700', letterSpacing: -0.2, padding: 0 },
  s13: { fontSize: 13, color: theme.colors.mutedForeground },
  s14: { alignItems: 'flex-start', paddingHorizontal: 16 },
  s15: { fontSize: 13, color: theme.colors.mutedForeground, paddingHorizontal: 16 },
  s16: { fontSize: 13, color: theme.colors.destructive, paddingHorizontal: 16 },
  s17: { gap: 8 },
  s18: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 16 },
  s19: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4, color: theme.colors.foreground },
  s20: { color: theme.colors.mutedForeground },
  s21: { borderRadius: 4, height: 4, marginHorizontal: 4, overflow: 'hidden' },
  s22: { borderRadius: 4, height: 4 },
  s23: { color: theme.colors.tertiary, paddingHorizontal: 16 },
  s24: { gap: 8 },
  s25: { gap: 8 },
  s26: { gap: 8 },
  s27: { gap: 8 },
}));
