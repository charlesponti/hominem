import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import React, { useEffect, useReducer, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { ProtectedRouteFallback } from '~/components/protected/protected-route-fallback';
import { makeStyles, useThemeColor } from '~/components/theme';
import { TextField } from '~/components/ui';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import { getAppLockEnabled, setAppLockEnabled } from '~/hooks/use-app-lock';
import { getPreventScreenshots, setPreventScreenshots } from '~/hooks/use-screen-capture';
import { useAuth } from '~/services/auth/auth-provider';
import { ARCHIVED_CHATS_ROUTE } from '~/services/navigation/routes';
import { useMonthlyUsage } from '~/services/usage/use-usage-query';
import t from '~/translations';

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
const usagePeriodFormatter = new Intl.DateTimeFormat('en-US', {
  month: '2-digit',
  year: '2-digit',
});

function formatUsagePeriod(date: Date): string {
  const parts = usagePeriodFormatter.formatToParts(date);
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  return `${month} '${year}`;
}

function formatUsd(amount: number): string {
  return usdFormatter.format(amount);
}

function showDeleteAccountAlert() {
  Alert.alert(t.settings.deleteAccount.alertTitle, t.settings.deleteAccount.alertMessage, [
    { text: t.settings.deleteAccount.ok, style: 'default' },
  ]);
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
    <View style={[styles.row, { minHeight: 44 }]}>
      <View style={styles.rowContent}>
        <AppIcon name={icon} size={18} tintColor={destructive ? destructiveColor : tertiaryColor} />
        <View style={styles.labelContent}>
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
      </View>
      {accessory}
    </View>
  );

  if (!onPress) {
    return (
      <View testID={testID} style={styles.staticRow}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.pressableRow, pressed ? { opacity: 0.6 } : undefined]}
    >
      {content}
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
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
      <View style={styles.identityRow}>
        <View style={[styles.avatar, { backgroundColor: popoverColor }]}>
          <Text style={styles.avatarText}>
            {getInitials(state.name, currentUser?.email ?? '?')}
          </Text>
        </View>
        <View style={styles.identityContent}>
          <TextField
            key={`name-${currentUser?.id ?? 'anonymous'}`}
            value={state.name}
            placeholder={t.settings.name.placeholder}
            returnKeyType="done"
            selectionColor={textPrimaryColor}
            cursorColor={textPrimaryColor}
            style={[styles.nameField, { borderWidth: 0, color: textPrimaryColor }]}
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
          <Text style={styles.email}>{currentUser?.email ?? t.settings.emailMissing}</Text>
        </View>
      </View>

      {nameChanged ? (
        <View style={styles.saveRow}>
          <Button
            label={saveStatus === 'saving' ? t.settings.name.saving : t.settings.name.save}
            onPress={() => void onSavePress()}
            disabled={saveStatus === 'saving'}
            variant="secondary"
            size="sm"
          />
        </View>
      ) : null}
      {saveStatus === 'saved' ? (
        <Text style={styles.savedMessage}>{t.settings.name.saved}</Text>
      ) : null}
      {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}

      {/* Usage */}
      {monthlyUsage ? (
        <View testID="settings-usage-section" style={styles.usageSection}>
          <SectionLabel>{`AI usage · ${formatUsagePeriod(new Date())}`}</SectionLabel>
          <View style={styles.usageSummary}>
            <Text style={[styles.usageAmount, { fontVariant: ['tabular-nums'] }]}>
              {formatUsd(monthlyUsage.totalCostUsd)}
            </Text>
            <Text style={[styles.usageLimit, { fontVariant: ['tabular-nums'] }]}>
              of {formatUsd(monthlyUsage.limitUsd)} · {usagePercent.toFixed(0)}%
            </Text>
          </View>
          <View style={[styles.usageBar, { backgroundColor: borderDefaultColor }]}>
            <View
              style={[
                styles.usageBarFill,
                {
                  width: `${usagePercent}%`,
                  backgroundColor: monthlyUsage.isOverLimit ? destructiveColor : textPrimaryColor,
                },
              ]}
            />
          </View>
          <Text style={styles.usageResetMessage}>
            {monthlyUsage.isOverLimit
              ? "You've reached this month's free AI usage limit. It resets at the start of next month."
              : 'Resets at the start of next month.'}
          </Text>
        </View>
      ) : null}

      {/* Privacy */}
      <View style={styles.privacySection}>
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
      <View style={styles.chatsSection}>
        <SectionLabel>{t.settings.sections.chats}</SectionLabel>
        <SettingsRow
          icon="archivebox"
          label={t.settings.archivedChats}
          onPress={onArchivedChatsPress}
          accessory={<AppIcon name="chevron.right" size={12} tintColor={tertiaryColor} />}
        />
      </View>

      {__DEV__ ? (
        <View style={styles.developmentSection}>
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
      <View style={styles.dangerSection}>
        <SettingsRow
          icon="rectangle.portrait.and.arrow.right"
          label={t.settings.signOut.label}
          onPress={onLogoutPress}
        />
        <SettingsRow
          icon="trash"
          label={t.settings.deleteAccount.label}
          onPress={showDeleteAccountAlert}
          destructive
        />
      </View>
    </ScrollView>
  );
}

export default Settings;

const styles = makeStyles((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  labelContent: { flex: 1, gap: 2 },
  label: {},
  description: { fontSize: 13, color: theme.colors.mutedForeground },
  staticRow: { paddingHorizontal: 16 },
  pressableRow: { paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.mutedForeground,
    paddingHorizontal: 16,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 52,
    width: 52,
  },
  avatarText: { fontSize: 19, fontWeight: '700', color: theme.colors.foreground },
  identityContent: { flex: 1, gap: 2 },
  nameField: { fontSize: 20, fontWeight: '700', letterSpacing: -0.2, padding: 0 },
  email: { fontSize: 13, color: theme.colors.mutedForeground },
  saveRow: { alignItems: 'flex-start', paddingHorizontal: 16 },
  savedMessage: { fontSize: 13, color: theme.colors.mutedForeground, paddingHorizontal: 16 },
  saveError: { fontSize: 13, color: theme.colors.destructive, paddingHorizontal: 16 },
  usageSection: { gap: 8 },
  usageSummary: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 16 },
  usageAmount: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: theme.colors.foreground,
  },
  usageLimit: { color: theme.colors.mutedForeground },
  usageBar: { borderRadius: 4, height: 4, marginHorizontal: 4, overflow: 'hidden' },
  usageBarFill: { borderRadius: 4, height: 4 },
  usageResetMessage: { color: theme.colors.tertiary, paddingHorizontal: 16 },
  privacySection: { gap: 8 },
  chatsSection: { gap: 8 },
  developmentSection: { gap: 8 },
  dangerSection: { gap: 8 },
}));
