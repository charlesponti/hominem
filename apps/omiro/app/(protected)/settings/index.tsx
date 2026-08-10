import { TextField } from '@ponti-studios/ui/native';
import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import React, { useEffect, useReducer, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { ProtectedRouteFallback } from '~/components/protected/protected-route-fallback';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import { getAppLockEnabled, setAppLockEnabled } from '~/hooks/use-app-lock';
import { getPreventScreenshots, setPreventScreenshots } from '~/hooks/use-screen-capture';
import { useAuth } from '~/services/auth/auth-provider';
import { resolveProtectedRouteState } from '~/services/auth/protected-route-state';
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
  const [destructiveColor, textPrimaryColor, tertiaryColor] = useCSSVariable([
    '--color-destructive',
    '--color-foreground',
    '--color-tertiary',
  ]) as string[];

  const labelColor = destructive ? destructiveColor : textPrimaryColor;

  const content = (
    <View className="flex-row items-center justify-between gap-3" style={{ minHeight: 44 }}>
      <View className="flex-1 flex-row items-center gap-2.5">
        <AppIcon name={icon} size={18} tintColor={destructive ? destructiveColor : tertiaryColor} />
        <View className="flex-1 gap-0.5">
          <Text className="text-base" style={{ color: labelColor }}>
            {label}
          </Text>
          {description ? (
            <Text className="text-[13px] text-muted-foreground">{description}</Text>
          ) : null}
        </View>
      </View>
      {accessory}
    </View>
  );

  if (!onPress) {
    return (
      <View testID={testID} className="px-4">
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className="px-4"
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
    >
      {content}
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text className="text-[13px] font-semibold text-muted-foreground px-4">{children}</Text>;
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
    useCSSVariable([
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
    router.push('/(protected)/dev/ui-lab' as never);
  };

  const protectedRouteState = resolveProtectedRouteState({ isPending, isSignedIn });

  if (protectedRouteState.showFallback) {
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
      <View className="flex-row items-center gap-3 px-4">
        <View
          className="items-center justify-center rounded-xl h-[52px] w-[52px]"
          style={{ backgroundColor: popoverColor }}
        >
          <Text className="text-[19px] font-bold text-foreground">
            {getInitials(state.name, currentUser?.email ?? '?')}
          </Text>
        </View>
        <View className="flex-1 gap-0.5">
          <TextField
            key={`name-${currentUser?.id ?? 'anonymous'}`}
            value={state.name}
            placeholder={t.settings.name.placeholder}
            returnKeyType="done"
            selectionColor={textPrimaryColor}
            cursorColor={textPrimaryColor}
            className="text-[20px] font-bold tracking-[-0.2px] p-0"
            style={{ borderWidth: 0, color: textPrimaryColor }}
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
          <Text className="text-[13px] text-muted-foreground">
            {currentUser?.email ?? t.settings.emailMissing}
          </Text>
        </View>
      </View>

      {nameChanged ? (
        <View className="items-start px-4">
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
        <Text className="text-[13px] text-muted-foreground px-4">{t.settings.name.saved}</Text>
      ) : null}
      {saveError ? <Text className="text-[13px] text-destructive px-4">{saveError}</Text> : null}

      {/* Usage */}
      {monthlyUsage ? (
        <View testID="settings-usage-section" className="gap-2">
          <SectionLabel>AI usage this month</SectionLabel>
          <View className="flex-row items-baseline gap-2 px-4">
            <Text
              className="text-[28px] font-bold tracking-[-0.4px] text-foreground"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatUsd(monthlyUsage.totalCostUsd)}
            </Text>
            <Text
              className="text-sm text-muted-foreground"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              of {formatUsd(monthlyUsage.limitUsd)} · {usagePercent.toFixed(0)}%
            </Text>
          </View>
          <View
            className="rounded h-1 mx-1 overflow-hidden"
            style={{ backgroundColor: borderDefaultColor }}
          >
            <View
              className="rounded h-1"
              style={{
                width: `${usagePercent}%`,
                backgroundColor: monthlyUsage.isOverLimit ? destructiveColor : textPrimaryColor,
              }}
            />
          </View>
          <Text className="text-xs text-tertiary px-4">
            {monthlyUsage.isOverLimit
              ? "You've reached this month's free AI usage limit. It resets at the start of next month."
              : 'Resets at the start of next month.'}
          </Text>
        </View>
      ) : null}

      {/* Privacy */}
      <View className="gap-2">
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
      <View className="gap-2">
        <SectionLabel>{t.settings.sections.chats}</SectionLabel>
        <SettingsRow
          icon="archivebox"
          label={t.settings.archivedChats}
          onPress={onArchivedChatsPress}
          accessory={<AppIcon name="chevron.right" size={12} tintColor={tertiaryColor} />}
        />
      </View>

      {__DEV__ ? (
        <View className="gap-2">
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
      <View className="gap-2">
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
